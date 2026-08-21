<?php

namespace App\Services;

use App\Services\Midtrans\MidtransGatewayInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Service Abstraksi Payment Gateway Dinamis.
 * Mendukung Midtrans Snap & Pakasir Payment Gateway sesuai setting active_gateway di database.
 */
class PaymentGatewayService
{
    public function __construct(
        private readonly MidtransGatewayInterface $midtransGateway,
    ) {}

    public function getActiveProvider(): string
    {
        try {
            $row = DB::table('settings')
                ->where('group', 'payment')
                ->where('key', 'active_gateway')
                ->first();

            return $row && ! empty($row->value) ? strtolower($row->value) : 'midtrans';
        } catch (Throwable) {
            return 'midtrans';
        }
    }

    /**
     * Membuat transaksi pembayaran dinamis sesuai provider aktif.
     *
     * @return array{provider: string, token: ?string, payment_url: ?string, order_id: string}
     */
    public function createTransaction(
        string $orderId,
        int $amount,
        array $customerDetails = [],
        array $itemDetails = [],
        array $enabledPayments = []
    ): array {
        $provider = $this->getActiveProvider();

        if ($provider === 'pakasir') {
            $baseUrl = rtrim((string) config('services.pakasir.base_url', 'https://app.pakasir.com'), '/');
            $slug    = (string) config('services.pakasir.slug', 'pos-mentai');
            $apiKey  = (string) config('services.pakasir.api_key', '');

            // Pakasir PG URL Format: https://app.pakasir.com/pay/{slug}/{amount}?order_id={orderId}
            // Using path parameter for amount prevents "Nominal transaksi tidak valid" JS alert from Pakasir frontend
            $paymentUrl = "{$baseUrl}/pay/{$slug}/{$amount}?order_id={$orderId}";

            Log::info('Pakasir transaction created', [
                'order_id' => $orderId,
                'amount' => $amount,
                'payment_url' => $paymentUrl,
            ]);

            return [
                'provider' => 'pakasir',
                'token' => null,
                'payment_url' => $paymentUrl,
                'qris_url' => $paymentUrl,
                'order_id' => $orderId,
                'amount' => $amount,
                'slug' => $slug,
            ];
        }

        // Default: Midtrans Snap Gateway
        $midtransResult = $this->midtransGateway->createTransaction(
            $orderId,
            $amount,
            $customerDetails,
            $itemDetails,
            $enabledPayments
        );

        return [
            'provider' => 'midtrans',
            'token' => $midtransResult['token'] ?? null,
            'payment_url' => $midtransResult['redirect_url'] ?? null,
            'order_id' => $orderId,
            'amount' => $amount,
        ];
    }
}
