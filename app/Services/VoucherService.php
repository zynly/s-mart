<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\Member;
use App\Models\Sale;
use Illuminate\Support\Facades\DB;

/**
 * T-064. Aturan (PROMPT §Fase 10 bagian 4):
 *   - Sekali pakai kecuali quota > 1.
 *   - Wajib punya masa berlaku (valid_from/valid_until).
 *   - Minimal belanja bila diatur (min_purchase).
 *   - Maksimal potongan bila persentase (max_discount).
 *   - Produk dikecualikan tidak ikut dihitung dasar diskon.
 *   - Tidak ada kembalian — sisa nilai kupon hangus (potongan dibatasi
 *     sampai total tagihan, tidak pernah negatif).
 *   - Satu kupon per nota (tidak ditumpuk dengan kupon lain).
 *   - Saat void: revertCoupon() (T-071) membalikkan used_count dan
 *     mengembalikan status ke 'active' bila belum expired
 *     (CATATAN-PERBAIKAN.md §Fase 11).
 */
class VoucherService
{
    /**
     * @param  array<int, array{product_id:int, subtotal:int}>  $lines
     * @return array{valid: bool, coupon: ?Coupon, discount: int, message: ?string}
     */
    public function validate(string $code, array $lines, ?Member $member): array
    {
        $coupon = Coupon::where('code', $code)->first();

        if ($coupon === null) {
            return ['valid' => false, 'coupon' => null, 'discount' => 0, 'message' => 'Kode kupon tidak ditemukan.'];
        }

        if ($coupon->status !== 'active') {
            return ['valid' => false, 'coupon' => $coupon, 'discount' => 0, 'message' => 'Kupon sudah tidak aktif.'];
        }

        if (now()->lt($coupon->valid_from) || now()->gt($coupon->valid_until)) {
            return ['valid' => false, 'coupon' => $coupon, 'discount' => 0, 'message' => 'Kupon di luar masa berlaku.'];
        }

        if ($coupon->used_count >= $coupon->quota) {
            return ['valid' => false, 'coupon' => $coupon, 'discount' => 0, 'message' => 'Kuota kupon sudah habis.'];
        }

        if ($coupon->member_id !== null && (! $member || $coupon->member_id !== $member->id)) {
            return ['valid' => false, 'coupon' => $coupon, 'discount' => 0, 'message' => 'Kupon ini bersifat personal untuk anggota lain.'];
        }

        if ($member !== null && $coupon->per_member_limit > 0) {
            $usedByMember = CouponRedemption::where('coupon_id', $coupon->id)
                ->where('member_id', $member->id)
                ->where('is_reverted', false)
                ->count();

            if ($usedByMember >= $coupon->per_member_limit) {
                return ['valid' => false, 'coupon' => $coupon, 'discount' => 0, 'message' => 'Kupon ini sudah pernah dipakai anggota ini.'];
            }
        }

        $excluded = collect($coupon->excluded_product_ids ?? []);
        $eligibleSubtotal = collect($lines)
            ->reject(fn ($l) => $excluded->contains($l['product_id']))
            ->sum('subtotal');

        if ($coupon->min_purchase !== null && $eligibleSubtotal < $coupon->min_purchase) {
            return ['valid' => false, 'coupon' => $coupon, 'discount' => 0, 'message' => "Minimal belanja Rp {$coupon->min_purchase} untuk memakai kupon ini."];
        }

        $discount = match ($coupon->discount_type) {
            'percent' => min(
                (int) round($eligibleSubtotal * $coupon->discount_value / 100),
                $coupon->max_discount ?? PHP_INT_MAX,
            ),
            'amount' => min($coupon->discount_value, $eligibleSubtotal),
            default => 0,
        };

        return ['valid' => true, 'coupon' => $coupon, 'discount' => $discount, 'message' => null];
    }

    public function redeem(Coupon $coupon, Sale $sale, ?Member $member, int $discountAmount): CouponRedemption
    {
        return DB::transaction(function () use ($coupon, $sale, $member, $discountAmount) {
            $locked = Coupon::lockForUpdate()->findOrFail($coupon->id);

            $redemption = CouponRedemption::create([
                'coupon_id' => $locked->id,
                'sale_id' => $sale->id,
                'member_id' => $member?->id,
                'discount_amount' => $discountAmount,
                'redeemed_at' => now(),
            ]);

            $newUsedCount = $locked->used_count + 1;
            $locked->update([
                'used_count' => $newUsedCount,
                'status' => $newUsedCount >= $locked->quota ? 'used' : 'active',
            ]);

            return $redemption;
        });
    }

    /**
     * T-071. Dipanggil VoidService saat sebuah nota dibatalkan. Contoh
     * kode di CATATAN-PERBAIKAN.md §Fase 11 selalu mengembalikan status
     * ke 'active' bila belum expired — sengaja DIBEDAKAN di sini: kupon
     * yang sudah sengaja dibatalkan admin lewat CouponController::cancel()
     * (status 'cancelled') tidak boleh hidup lagi hanya karena sebuah
     * nota lamanya di-void.
     */
    public function revertCoupon(CouponRedemption $redemption): void
    {
        if ($redemption->is_reverted) {
            return;
        }

        DB::transaction(function () use ($redemption) {
            $locked = CouponRedemption::lockForUpdate()->findOrFail($redemption->id);

            if ($locked->is_reverted) {
                return;
            }

            $coupon = Coupon::lockForUpdate()->findOrFail($locked->coupon_id);

            $locked->update(['is_reverted' => true]);
            Coupon::whereKey($coupon->id)->where('used_count', '>', 0)->decrement('used_count');
            $coupon->refresh();

            if ($coupon->status === 'used' && $coupon->valid_until >= now()) {
                $coupon->update(['status' => 'active']);
            }
        });
    }
}
