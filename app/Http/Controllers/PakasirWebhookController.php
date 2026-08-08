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

        if ($topupRequest === null) {
            Log::info('Pakasir webhook: reference order_id not found', ['order_id' => $orderId]);
            return response()->json(['status' => 'error', 'message' => 'Order ID tidak ditemukan'], 404);
        }

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
            'message' => 'Pakasir webhook callback processed successfully',
            'order_id' => $orderId,
        ]);
    }
}
