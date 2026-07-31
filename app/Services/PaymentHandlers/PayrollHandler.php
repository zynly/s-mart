<?php

namespace App\Services\PaymentHandlers;

use App\Models\CashierSession;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\PayrollDeduction;
use App\Models\Sale;
use App\Models\SalePayment;
use DomainException;

/**
 * Hanya untuk anggota tipe fasilitator/staff. Tidak ada perpindahan
 * kas/saldo saat ini — nota tetap 'settled' dari sisi kasir, tapi
 * kewajiban riilnya baru "dibayar" saat bendahara memotong gaji
 * periode berjalan (ditandai lewat halaman rekap payroll_deductions,
 * status berubah dari pending -> deducted).
 */
class PayrollHandler implements PaymentHandler
{
    public function handle(Sale $sale, PaymentMethod $method, array $payload, ?Member $member, CashierSession $session, Outlet $outlet): SalePayment
    {
        if ($member === null) {
            throw new DomainException('Metode Potong Gaji membutuhkan anggota yang terpilih.');
        }

        if (! in_array($member->type, ['fasilitator', 'staff'], true)) {
            throw new DomainException('Metode Potong Gaji hanya berlaku untuk fasilitator/staf.');
        }

        $amount = (int) $payload['amount'];

        PayrollDeduction::create([
            'member_id' => $member->id,
            'sale_id' => $sale->id,
            'period' => now()->format('Y-m'),
            'amount' => $amount,
            'status' => 'pending',
        ]);

        return SalePayment::create([
            'sale_id' => $sale->id,
            'payment_method_id' => $method->id,
            'amount' => $amount,
            'net_amount' => $amount,
            'status' => 'settled',
            'settled_at' => now(),
        ]);
    }
}
