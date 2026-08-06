<?php

namespace App\Services\Midtrans;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Default binding (lihat config/services.php + AppServiceProvider) —
 * TIDAK memanggil API Midtrans sungguhan, cuma log + kembalikan token
 * dummy. Pola sama persis App\Services\WhatsApp\NullGateway. Dipakai
 * di dev lokal & php artisan test supaya tidak pernah tidak sengaja
 * memanggil API sungguhan tanpa kredensial dikonfigurasi eksplisit.
 */
class NullMidtransGateway implements MidtransGatewayInterface
{
    public function createTransaction(string $orderId, int $grossAmount, array $customerDetails, array $itemDetails, array $enabledPayments = []): array
    {
        Log::info('NullMidtransGateway: createTransaction (tidak memanggil API sungguhan)', [
            'order_id' => $orderId,
            'gross_amount' => $grossAmount,
        ]);

        return [
            'token' => 'null-gateway-'.Str::uuid(),
            'redirect_url' => 'https://app.sandbox.midtrans.com/snap/v4/redirection/null-gateway',
        ];
    }

    public function getActivePaymentChannels(): array
    {
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
