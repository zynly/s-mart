<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Member;

class MemberLimitService
{
    /**
     * Cek kelayakan belanja anggota dari sisi status, jadwal, dan
     * kategori terblokir. Limit harian/mingguan (butuh agregasi
     * transaksi penjualan) dicek di PaymentService/SaleService
     * saat Fase 8/9 — belum ada tabel sales di fase ini.
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
