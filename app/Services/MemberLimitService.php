<?php

namespace App\Services;

use App\Models\Category;
use App\Models\DepositTransaction;
use App\Models\Member;

class MemberLimitService
{
    /**
     * Cek kelayakan belanja anggota dari sisi status, jadwal, dan
     * kategori terblokir. Limit harian/mingguan dicek terpisah lewat
     * checkSpendingLimit() (Fase 9, T-056) — butuh agregasi
     * deposit_transactions yang baru relevan saat pembayaran saldo.
     *
     * @return array{allowed: bool, reason: string|null}
     */
    public function canPurchase(Member $member, ?Category $category = null): array
    {
        if ($member->status === 'suspended') {
            return ['allowed' => false, 'reason' => $member->suspend_reason ?? 'Anggota sedang disuspend.'];
        }

        if ($member->status !== 'active') {
            return ['allowed' => false, 'reason' => "Status anggota: {$member->status}."];
        }

        if ($member->suspended_until !== null && $member->suspended_until->isFuture()) {
            return ['allowed' => false, 'reason' => $member->suspend_reason ?? 'Anggota sedang disuspend.'];
        }

        if ($category !== null && in_array($category->id, $member->blocked_categories ?? [], true)) {
            return ['allowed' => false, 'reason' => "Kategori \"{$category->name}\" diblokir untuk anggota ini."];
        }

        if (! $this->withinAllowedDay($member)) {
            return ['allowed' => false, 'reason' => 'Bukan hari belanja yang diizinkan.'];
        }

        if (! $this->withinAllowedHours($member)) {
            return ['allowed' => false, 'reason' => 'Di luar jam belanja yang diizinkan.'];
        }

        return ['allowed' => true, 'reason' => null];
    }

    /**
     * Total belanja saldo (tipe 'purchase', nilainya negatif di ledger)
     * hari ini & minggu ini terhadap daily_limit/weekly_limit anggota.
     * Dipanggil oleh DepositHandler sebelum memotong saldo — dicek
     * terhadap nominal yang AKAN dibayar, bukan sesudahnya.
     *
     * @return array{allowed: bool, reason: string|null}
     */
    public function checkSpendingLimit(Member $member, int $amount): array
    {
        if ($member->daily_limit !== null) {
            $spentToday = $this->spentSince($member, now()->startOfDay());

            if ($spentToday + $amount > $member->daily_limit) {
                return ['allowed' => false, 'reason' => 'Melebihi limit harian (Rp '.number_format($member->daily_limit, 0, ',', '.').').'];
            }
        }

        if ($member->weekly_limit !== null) {
            $spentThisWeek = $this->spentSince($member, now()->startOfWeek());

            if ($spentThisWeek + $amount > $member->weekly_limit) {
                return ['allowed' => false, 'reason' => 'Melebihi limit mingguan (Rp '.number_format($member->weekly_limit, 0, ',', '.').').'];
            }
        }

        return ['allowed' => true, 'reason' => null];
    }

    private function spentSince(Member $member, \DateTimeInterface $since): int
    {
        return (int) abs(DepositTransaction::where('member_id', $member->id)
            ->where('type', 'purchase')
            ->where('created_at', '>=', $since)
            ->sum('amount'));
    }

    private function withinAllowedDay(Member $member): bool
    {
        if (empty($member->allowed_days)) {
            return true;
        }

        return in_array((int) now()->dayOfWeekIso, $member->allowed_days, true);
    }

    private function withinAllowedHours(Member $member): bool
    {
        if (empty($member->allowed_hours)) {
            return true;
        }

        $now = now()->format('H:i');

        foreach ($member->allowed_hours as [$start, $end]) {
            if ($now >= $start && $now <= $end) {
                return true;
            }
        }

        return false;
    }
}
