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
}
