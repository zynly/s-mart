<?php

namespace App\Services\PaymentHandlers;

use App\Exceptions\InsufficientPointBalanceException;
use App\Models\CashierSession;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\SalePayment;
use DomainException;
use Illuminate\Support\Facades\DB;

/**
 * Konversi poin -> rupiah pakai config('pos.point_value'). Akrual poin
 * & masa berlaku 12 bulan (PointService penuh) baru dibangun Fase 10
 * (T-066) — handler ini hanya menangani REDEMPTION dari
 * members.point_balance yang sudah ada sejak Fase 3, dengan pola kunci
 * baris yang sama seperti DepositService (mencegah dua kasir memotong
 * poin santri yang sama secara bersamaan).
 */
class PointHandler implements PaymentHandler
{
    public function handle(Sale $sale, PaymentMethod $method, array $payload, ?Member $member, CashierSession $session, Outlet $outlet): SalePayment
    {
        if ($member === null) {
            throw new DomainException('Metode Poin membutuhkan anggota yang terpilih.');
        }

        $pointUsed = (int) ($payload['point_used'] ?? 0);

        if ($pointUsed <= 0) {
            throw new DomainException('Jumlah poin yang dipakai harus lebih dari 0.');
        }

        $pointValue = (int) config('pos.point_value', 100);
        $amount = $pointUsed * $pointValue;

        DB::transaction(function () use ($member, $pointUsed) {
            $locked = Member::lockForUpdate()->findOrFail($member->id);

            if ($locked->point_balance < $pointUsed) {
                throw InsufficientPointBalanceException::make($locked->point_balance, $pointUsed);
            }

            $locked->forceFill(['point_balance' => $locked->point_balance - $pointUsed])->save();
        });

        return SalePayment::create([
            'sale_id' => $sale->id,
            'payment_method_id' => $method->id,
            'amount' => $amount,
            'point_used' => $pointUsed,
            'net_amount' => $amount,
            'status' => 'settled',
            'settled_at' => now(),
        ]);
    }
}
