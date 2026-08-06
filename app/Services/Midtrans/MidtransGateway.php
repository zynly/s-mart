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

    /**
     * Mendapatkan daftar channel/metode pembayaran yang aktif di akun Midtrans Merchant
     * berdasarkan kredensial ServerKey.
     *
     * @return array<int, array{code: string, name: string, category: string, is_active: bool}>
     */
    public function getActivePaymentChannels(): array
    {
        $serverKey = config('services.midtrans.server_key');
        $baseUrl = config('services.midtrans.is_production')
            ? 'https://api.midtrans.com'
            : 'https://api.sandbox.midtrans.com';

        try {
            $response = Http::withBasicAuth($serverKey, '')
                ->acceptJson()
                ->get("{$baseUrl}/v2/merchant/payment_channels");

            if ($response->successful() && is_array($response->json('payment_channels'))) {
                /** @var array<int, array{code?: string, channel_name?: string, category?: string, is_active?: bool}> $channels */
                $channels = $response->json('payment_channels');

                return array_map(fn ($ch) => [
                    'code' => $ch['code'] ?? '',
                    'name' => $ch['channel_name'] ?? $ch['code'] ?? '',
                    'category' => $ch['category'] ?? 'other',
                    'is_active' => (bool) ($ch['is_active'] ?? true),
                ], $channels);
            }
        } catch (\Throwable $e) {
            Log::warning('Midtrans getActivePaymentChannels API query failed, fallback to default channel list', [
                'error' => $e->getMessage(),
            ]);
        }

        // Fallback daftar channel standar Midtrans jika endpoint merchant API belum didukung di Sandbox
        return [
            ['code' => 'qris', 'name' => 'QRIS (GoPay, OVO, ShopeePay, Dana, LinkAja)', 'category' => 'qris', 'is_active' => true],
            ['code' => 'gopay', 'name' => 'GoPay', 'category' => 'ewallet', 'is_active' => true],
            ['code' => 'shopeepay', 'name' => 'ShopeePay', 'category' => 'ewallet', 'is_active' => true],
            ['code' => 'bca_va', 'name' => 'BCA Virtual Account', 'category' => 'bank_transfer', 'is_active' => true],
            ['code' => 'bni_va', 'name' => 'BNI Virtual Account', 'category' => 'bank_transfer', 'is_active' => true],
            ['code' => 'bri_va', 'name' => 'BRI Virtual Account', 'category' => 'bank_transfer', 'is_active' => true],
            ['code' => 'cimb_va', 'name' => 'CIMB Niaga Virtual Account', 'category' => 'bank_transfer', 'is_active' => true],
            ['code' => 'permata_va', 'name' => 'Permata Virtual Account', 'category' => 'bank_transfer', 'is_active' => true],
            ['code' => 'credit_card', 'name' => 'Kartu Kredit / Debit', 'category' => 'card', 'is_active' => true],
        ];
    }
}
