<?php

namespace App\Services\PaymentHandlers;

use App\Models\CashierSession;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\SalePayment;

/**
 * Tabel coupons/coupon_redemptions belum ada sampai Fase 10 (T-061),
 * jadi handler ini belum bisa validasi kode voucher — nominal
 * dimasukkan manual oleh kasir dari voucher fisik. coupon_id tetap
 * null sampai VoucherHandler diperbarui di Fase 10 untuk lookup Coupon
 * asli dan mengisi kolom itu. Aturan yang SUDAH ditegakkan sekarang:
 * tidak ada kembalian, sisa nilai voucher hangus (amount = nilai yang
 * dipakai, bukan nilai voucher penuh).
 */
class VoucherHandler implements PaymentHandler
{
    public function handle(Sale $sale, PaymentMethod $method, array $payload, ?Member $member, CashierSession $session, Outlet $outlet): SalePayment
    {
        $amount = (int) $payload['amount'];

        return SalePayment::create([
            'sale_id' => $sale->id,
            'payment_method_id' => $method->id,
            'amount' => $amount,
            'reference_no' => $payload['reference_no'] ?? null,
            'net_amount' => $amount,
            'status' => 'settled',
            'settled_at' => now(),
        ]);
    }
}
