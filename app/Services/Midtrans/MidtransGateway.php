<?php

namespace App\Services\Midtrans;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Panggil REST API Snap Midtrans langsung via Laravel HTTP client —
 * SENGAJA tidak pakai SDK `midtrans/midtrans-php` (cuma 1 endpoint
 * POST + Basic Auth, tidak sepadan menambah dependency SDK pihak
 * ketiga untuk itu).
 */
class MidtransGateway implements MidtransGatewayInterface
{
    public function createTransaction(string $orderId, int $grossAmount, array $customerDetails, array $itemDetails, array $enabledPayments = []): array
    {
        $serverKey = config('services.midtrans.server_key');
        $baseUrl = config('services.midtrans.is_production')
            ? 'https://app.midtrans.com'
            : 'https://app.sandbox.midtrans.com';

        $response = Http::withBasicAuth($serverKey, '')
            ->acceptJson()
            ->post("{$baseUrl}/snap/v1/transactions", array_filter([
                'transaction_details' => [
                    'order_id' => $orderId,
                    'gross_amount' => $grossAmount,
                ],
                // customer_details opsional — PHP array kosong ter-JSON-encode
                // sebagai `[]`, bukan `{}`, yang bisa ditolak Midtrans sebagai
                // tipe salah. Hilangkan key-nya sama sekali kalau kosong,
                // alih-alih mengirim array kosong.
                'customer_details' => $customerDetails !== [] ? $customerDetails : null,
                'item_details' => $itemDetails,
                'enabled_payments' => $enabledPayments !== [] ? $enabledPayments : null,
            ]));

        if ($response->failed()) {
            // JANGAN log server key — cukup status & body respons Midtrans
            // untuk debugging (body error Midtrans sudah cukup deskriptif,
            // tidak pernah menyertakan kredensial kita sendiri).
            Log::error('Midtrans createTransaction gagal', [
                'order_id' => $orderId,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            throw new RuntimeException('Gagal membuat transaksi Midtrans: '.($response->json('error_messages.0') ?? 'unknown error'));
        }

        return [
            'token' => $response->json('token'),
            'redirect_url' => $response->json('redirect_url'),
        ];
    }
}
