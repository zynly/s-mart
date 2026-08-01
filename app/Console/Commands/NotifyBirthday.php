<?php

namespace App\Console\Commands;

use App\Models\Member;
use App\Services\GuardianNotificationService;
use Illuminate\Console\Command;

/**
 * T-100 (Fase 16). Dijadwalkan tepat setelah `member:birthday-bonus`
 * (06:00) supaya bonus/kupon sudah tercatat sebelum pesan dikirim —
 * command ini HANYA mengirim notifikasi, tidak menghitung/memberi
 * bonus sendiri (itu tanggung jawab `member:birthday-bonus`, T-054-
 * era, dipakai ulang apa adanya lewat config `pos.birthday_bonus_mode`
 * yang sama supaya pesan konsisten dengan bonus yang benar-benar
 * diberikan).
 */
class NotifyBirthday extends Command
{
    protected $signature = 'notify:birthday';

    protected $description = 'Kirim ucapan ulang tahun ke wali anggota yang berulang tahun hari ini';

    public function __construct(private readonly GuardianNotificationService $notificationService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $today = now();
        $mode = config('pos.birthday_bonus_mode', 'deposit');
        $amount = (int) config('pos.birthday_bonus_amount', 10000);
        $discountPercent = (int) config('pos.birthday_coupon_discount_percent', 10);
        $sent = 0;

        Member::where('status', 'active')
            ->whereNotNull('birth_date')
            ->whereMonth('birth_date', $today->month)
            ->whereDay('birth_date', $today->day)
            ->with(['guardians' => fn ($q) => $q->where('is_active', true)])
            ->chunkById(200, function ($members) use (&$sent, $mode, $amount, $discountPercent) {
                foreach ($members as $member) {
                    foreach ($member->guardians as $guardian) {
                        if ($mode === 'coupon') {
                            $this->notificationService->birthdayCoupon($guardian, $member, $discountPercent);
                        } else {
                            $this->notificationService->birthday($guardian, $member, $amount);
                        }
                        $sent++;
                    }
                }
            });

        $this->info("Selesai: {$sent} ucapan ulang tahun dikirim (mode: {$mode}).");

        return self::SUCCESS;
    }
}
