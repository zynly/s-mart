<?php

namespace App\Services;

use App\Exceptions\InsufficientPointBalanceException;
use App\Models\Member;
use App\Models\PointTransaction;
use App\Models\Sale;
use Illuminate\Support\Facades\DB;

/**
 * T-066. Ledger poin mengikuti pola yang sama dengan deposit_transactions
 * (ADR-002 versi poin) — member.point_balance hanyalah cache,
 * point_transactions adalah sumber kebenaran.
 */
class PointService
{
    public function earn(Member $member, int $grandTotal, ?Sale $sale = null): int
    {
        $ratio = (int) config('pos.point_ratio', 10000);

        if ($ratio <= 0 || $grandTotal <= 0) {
            return 0;
        }

        $multiplier = (float) ($member->level?->point_multiplier ?? 1);
        $points = (int) floor(($grandTotal / $ratio) * $multiplier);

        if ($points <= 0) {
            return 0;
        }

        DB::transaction(function () use ($member, $points, $sale) {
            $locked = Member::lockForUpdate()->findOrFail($member->id);
            $before = $locked->point_balance;
            $after = $before + $points;
            $locked->forceFill(['point_balance' => $after])->save();

            PointTransaction::create([
                'member_id' => $locked->id,
                'sale_id' => $sale?->id,
                'type' => 'earn',
                'points' => $points,
                'balance_before' => $before,
                'balance_after' => $after,
                'expired_at' => now()->addMonths((int) config('pos.point_expiry_months', 12))->toDateString(),
            ]);
        });

        return $points;
    }

    public function redeem(Member $member, int $points, ?Sale $sale = null): PointTransaction
    {
        return DB::transaction(function () use ($member, $points, $sale) {
            $locked = Member::lockForUpdate()->findOrFail($member->id);

            if ($locked->point_balance < $points) {
                throw InsufficientPointBalanceException::make($locked->point_balance, $points);
            }

            $before = $locked->point_balance;
            $after = $before - $points;
            $locked->forceFill(['point_balance' => $after])->save();

            return PointTransaction::create([
                'member_id' => $locked->id,
                'sale_id' => $sale?->id,
                'type' => 'redeem',
                'points' => -$points,
                'balance_before' => $before,
                'balance_after' => $after,
            ]);
        });
    }

    /**
     * Membalikkan poin yang TERLANJUR di-earn dari nota yang di-void
     * (CONTEXT.md aturan bisnis #13: "Void membalikkan semua ... poin").
     * Dipotong dari saldo BERJALAN, dibatasi maksimal saldo tersedia —
     * bila poin itu sudah terlanjur dibelanjakan member sebelum void,
     * saldo tidak boleh dipaksa negatif.
     */
    public function voidEarn(Member $member, int $points, ?Sale $sale = null): PointTransaction
    {
        return DB::transaction(function () use ($member, $points, $sale) {
            $locked = Member::lockForUpdate()->findOrFail($member->id);
            $reversal = min($points, $locked->point_balance);
            $before = $locked->point_balance;
            $after = $before - $reversal;
            $locked->forceFill(['point_balance' => $after])->save();

            return PointTransaction::create([
                'member_id' => $locked->id,
                'sale_id' => $sale?->id,
                'type' => 'adjustment',
                'points' => -$reversal,
                'balance_before' => $before,
                'balance_after' => $after,
                'note' => 'Pembalikan poin dari nota void',
            ]);
        });
    }

    public function refund(Member $member, int $points, ?Sale $sale = null): PointTransaction
    {
        return DB::transaction(function () use ($member, $points, $sale) {
            $locked = Member::lockForUpdate()->findOrFail($member->id);
            $before = $locked->point_balance;
            $after = $before + $points;
            $locked->forceFill(['point_balance' => $after])->save();

            return PointTransaction::create([
                'member_id' => $locked->id,
                'sale_id' => $sale?->id,
                'type' => 'adjustment',
                'points' => $points,
                'balance_before' => $before,
                'balance_after' => $after,
                'note' => 'Refund void poin',
            ]);
        });
    }

    /**
     * Kadaluwarsakan poin yang expired_at-nya sudah lewat. Disederhanakan:
     * setiap baris 'earn' yang sudah lewat expired_at diproses SEKALI
     * (ditandai lewat `note` unik di baris 'expired' agar idempoten bila
     * command dijalankan ulang), dipotong dari saldo BERJALAN saat ini
     * (bisa lebih kecil dari poin earn asal bila sebagian sudah dipakai).
     */
    public function expireDuePoints(): int
    {
        $expiredCount = 0;

        PointTransaction::where('type', 'earn')
            ->whereNotNull('expired_at')
            ->where('expired_at', '<=', now()->toDateString())
            ->orderBy('id')
            ->chunkById(200, function ($earnTransactions) use (&$expiredCount) {
                foreach ($earnTransactions as $earn) {
                    $marker = "expire-of-earn-{$earn->id}";

                    if (PointTransaction::where('note', $marker)->exists()) {
                        continue;
                    }

                    DB::transaction(function () use ($earn, $marker, &$expiredCount) {
                        $member = Member::lockForUpdate()->find($earn->member_id);

                        if ($member === null || $member->point_balance <= 0) {
                            PointTransaction::create([
                                'member_id' => $earn->member_id,
                                'type' => 'expired',
                                'points' => 0,
                                'balance_before' => $member->point_balance ?? 0,
                                'balance_after' => $member->point_balance ?? 0,
                                'note' => $marker,
                            ]);

                            return;
                        }

                        $expiring = min($earn->points, $member->point_balance);
                        $before = $member->point_balance;
                        $after = $before - $expiring;
                        $member->forceFill(['point_balance' => $after])->save();

                        PointTransaction::create([
                            'member_id' => $member->id,
                            'type' => 'expired',
                            'points' => -$expiring,
                            'balance_before' => $before,
                            'balance_after' => $after,
                            'note' => $marker,
                        ]);

                        $expiredCount++;
                    });
                }
            });

        return $expiredCount;
    }
}
