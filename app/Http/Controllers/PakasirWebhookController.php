<?php

namespace App\Http\Controllers;

use App\Models\TopupRequest;
use App\Services\GuardianNotificationService;
use App\Services\TopupRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Controller webhook callback untuk integrasi Pakasir Payment Gateway.
 * Endpoint: /api/v1/callback/pakasir & /pakasir/notification
 */
class PakasirWebhookController extends Controller
{
    public function __construct(
        private readonly TopupRequestService $topupRequestService,
        private readonly GuardianNotificationService $notificationService,
    ) {}

    public function handle(Request $request): JsonResponse
    {
        $payload = $request->all();
        Log::info('Pakasir webhook received', $payload);

        // Ekstraksi field identifier dari payload Pakasir (order_id, reference, invoice, dsb.)
        $orderId = (string) (
            $request->input('order_id')
            ?? $request->input('reference')
            ?? $request->input('trx_id')
            ?? $request->input('invoice')
            ?? $request->input('id')
        );

        $status = strtolower((string) (
            $request->input('status')
            ?? $request->input('payment_status')
            ?? $request->input('transaction_status')
            ?? 'pending'
        ));

        $transactionId = (string) (
            $request->input('transaction_id')
            ?? $request->input('payment_id')
            ?? $request->input('trx_id')
            ?? $orderId
        );

        // Verifikasi keaslian request (apabila Pakasir mengirim signature / api_key)
        $apiKey = config('services.pakasir.api_key');
        $requestApiKey = $request->input('api_key') ?? $request->header('X-Pakasir-Api-Key');

        if ($requestApiKey && ! hash_equals((string) $apiKey, (string) $requestApiKey)) {
            Log::warning('Pakasir webhook: API key mismatch', ['order_id' => $orderId]);
            return response()->json(['status' => 'error', 'message' => 'Unauthorized signature'], 403);
        }

        if (empty($orderId)) {
            return response()->json(['status' => 'error', 'message' => 'order_id / reference missing'], 422);
        }

        $topupRequest = TopupRequest::where('reference', $orderId)->first();

        if ($topupRequest !== null) {
            $isSuccess = in_array($status, ['completed', 'paid', 'success', 'settlement', 'berhasil'], true);

            if ($isSuccess) {
                $wasPending = $topupRequest->status === 'pending';
                $approved = $this->topupRequestService->approveViaGateway($topupRequest, $transactionId);

                if ($wasPending && $approved->guardian) {
                    $this->notificationService->topupVerified($approved->guardian, $approved->member, $approved->amount);
                }
            } elseif (in_array($status, ['deny', 'cancel', 'expire', 'failure', 'failed', 'batal'], true)) {
                $this->topupRequestService->markGatewayFailed($topupRequest, $status);
            }

            return response()->json([
                'status' => 'ok',
                'type' => 'topup',
                'message' => 'Pakasir topup webhook callback processed successfully',
                'order_id' => $orderId,
            ]);
        }

        // Cek jika order_id terkait dengan transaksi Penjualan Kasir (POS)
        $salePayment = \App\Models\SalePayment::where('reference_no', $orderId)->first();
        $sale = $salePayment?->sale ?? \App\Models\Sale::where('reference', $orderId)->first();

        if ($sale !== null) {
            if ($salePayment && $salePayment->gateway_status !== 'settlement') {
                $salePayment->update(['gateway_status' => 'settlement']);
            }

            return response()->json([
                'status' => 'ok',
                'type' => 'pos_sale',
                'message' => 'Pakasir POS sale payment webhook processed',
                'order_id' => $orderId,
                'sale_id' => $sale->id,
                'sale_reference' => $sale->reference,
                'receipt_url' => route('pos.sales.receipt', $sale->id),
                'receipt_pdf_url' => route('pos.sales.receipt-pdf', $sale->id),
            ]);
        }

        // Cek jika ada transaksi POS tertunda di Cache
        $pendingPayload = \Illuminate\Support\Facades\Cache::get("pos_pending_sale:{$orderId}");
        if ($pendingPayload !== null) {
            try {
                if (isset($pendingPayload['user_id'])) {
                    auth()->setUser(\App\Models\User::find($pendingPayload['user_id']));
                }

                $completedSale = app(\App\Services\SaleService::class)->complete($pendingPayload);
                \Illuminate\Support\Facades\Cache::forget("pos_pending_sale:{$orderId}");

                return response()->json([
                    'status' => 'ok',
                    'type' => 'pos_sale_auto_completed',
                    'message' => 'Pakasir POS sale auto completed via webhook callback',
                    'order_id' => $orderId,
                    'sale_id' => $completedSale->id,
                    'sale_reference' => $completedSale->reference,
                    'receipt_url' => route('pos.sales.receipt', $completedSale->id),
                    'receipt_pdf_url' => route('pos.sales.receipt-pdf', $completedSale->id),
                ]);
            } catch (\Throwable $e) {
                Log::error('Pakasir webhook: failed auto completing POS sale', ['order_id' => $orderId, 'error' => $e->getMessage()]);
            }
        }

        // Jika order_id merupakan transaksi POS (dimulai dari POS-) atau test callback dari Pakasir
        Log::info('Pakasir webhook: valid callback received for order_id', ['order_id' => $orderId, 'status' => $status]);

        return response()->json([
            'status' => 'ok',
            'type' => str_starts_with($orderId, 'POS-') ? 'pos_pending' : 'general',
            'message' => 'Pakasir webhook callback received and logged successfully',
            'order_id' => $orderId,
        ]);
    }
}
