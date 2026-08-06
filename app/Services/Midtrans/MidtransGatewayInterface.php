<?php

namespace App\Services\Midtrans;

/**
 * Pola sama persis dengan WhatsAppGatewayInterface (Fase 16,
 * app/Services/WhatsApp/) — satu method minimal, di-bind config-driven
 * di AppServiceProvider, default ke NullMidtransGateway supaya dev
 * lokal & php artisan test tidak pernah memanggil API sungguhan
 * kecuali MIDTRANS_GATEWAY diisi eksplisit.
 */
interface MidtransGatewayInterface
{
    /**
     * @param  array{first_name: string, email?: string, phone?: string}  $customerDetails
     * @param  array<int, array{id: string, price: int, quantity: int, name: string}>  $itemDetails
     * @param  array<int, string>  $enabledPayments  kode channel Midtrans (mis. 'gopay', 'bca_va') —
     *                                               array kosong berarti Snap menampilkan SEMUA metode yang aktif di akun. Dibatasi supaya
     *                                               Snap langsung buka metode yang relevan dengan pilihan kasir, bukan menu penuh.
     * @return array{token: string, redirect_url: string}
     */
    public function createTransaction(string $orderId, int $grossAmount, array $customerDetails, array $itemDetails, array $enabledPayments = []): array;

    /**
     * Mendapatkan daftar channel/metode pembayaran yang aktif di akun Midtrans Merchant
     * berdasarkan kredensial ServerKey.
     *
     * @return array<int, array{code: string, name: string, category: string, is_active: bool}>
     */
    public function getActivePaymentChannels(): array;
}
