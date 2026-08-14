<?php

namespace App\Http\Controllers;

use App\Models\TopupRequest;
use App\Services\GuardianNotificationService;
use App\Services\TopupRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Notification URL Midtrans (routes/web.php, DI LUAR grup `auth` —
 * Midtrans tidak punya sesi Laravel). Proteksi: verifikasi
 * signature_key di sini, BUKAN middleware auth — pola sama seperti
 * endpoint publik storefront `/cek-saldo` (throttle + alasan
 * dijelaskan di komentar route), lihat routes/web.php.
 */
class MidtransWebhookController extends Controller
{
    public function __construct(
        private readonly TopupRequestService $topupRequestService,
        private readonly GuardianNotificationService $notificationService,
    ) {}

    public function handle(Request $request): JsonResponse
    {
        $orderId = (string) $request->input('order_id');
        $statusCode = (string) $request->input('status_code');
        $grossAmount = (string) $request->input('gross_amount');
        $signatureKey = (string) $request->input('signature_key');
        $transactionStatus = (string) $request->input('transaction_status');
        $fraudStatus = $request->input('fraud_status');

        $expected = hash('sha512', $orderId.$statusCode.$grossAmount.config('services.midtrans.server_key'));

        if (! hash_equals($expected, $signatureKey)) {
            Log::warning('Midtrans webhook: signature tidak valid', ['order_id' => $orderId]);

            abort(403);
        }

        $topupRequest = TopupRequest::where('reference', $orderId)->first();

        if ($topupRequest === null) {
            $salePayment = \App\Models\SalePayment::where('reference_no', $orderId)->first();
            $sale = $salePayment?->sale ?? \App\Models\Sale::where('reference', $orderId)->first();

            if ($sale !== null || str_starts_with($orderId, 'POS-')) {
                return response()->json([
                    'status' => 'ok',
                    'type' => 'pos_sale',
                    'message' => 'Midtrans POS transaction webhook callback processed successfully',
                    'order_id' => $orderId,
                ]);
            }

            // 404 murni supaya Midtrans tidak retry notifikasi untuk
            // order_id yang memang tidak pernah dibuat sistem ini —
            // TAPI tetap balas JSON (bukan halaman error HTML).
            return response()->json(['status' => 'order_id tidak dikenal'], 404);
        }

        $isSuccess = in_array($transactionStatus, ['settlement', 'capture'], true)
            && ($fraudStatus === null || $fraudStatus === 'accept');

        if ($isSuccess) {
            // Cek status SEBELUM approveViaGateway() — method itu no-op
            // aman kalau dipanggil ulang (webhook duplikat), tapi
            // notifikasi hanya boleh dikirim SEKALI, saat transisi
            // pending->approved yang sebenarnya.
            $wasPending = $topupRequest->status === 'pending';

            $approved = $this->topupRequestService->approveViaGateway($topupRequest, (string) $request->input('transaction_id'));

            if ($wasPending && $approved->guardian) {
                $this->notificationService->topupVerified($approved->guardian, $approved->member, $approved->amount);
            }
        } elseif (in_array($transactionStatus, ['deny', 'cancel', 'expire', 'failure'], true)) {
            $this->topupRequestService->markGatewayFailed($topupRequest, $transactionStatus);
        }
        // 'pending' (mis. menunggu bayar VA/e-wallet) — tidak ada aksi,
        // baris tetap berstatus pending sampai notifikasi final datang.

        return response()->json(['status' => 'ok']);
    }
}
