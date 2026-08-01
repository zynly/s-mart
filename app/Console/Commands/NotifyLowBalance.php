<?php

namespace App\Console\Commands;

use App\Models\Member;
use App\Services\GuardianNotificationService;
use Illuminate\Console\Command;

/**
 * T-100 (Fase 16). Ambang per-wali dari `notification_settings.
 * low_balance_threshold` (T-097, wali bisa atur sendiri) — BUKAN satu
 * ambang global, karena kebutuhan tiap keluarga beda.
 */
class NotifyLowBalance extends Command
{
    protected $signature = 'notify:low-balance';

    protected $description = 'Kirim notifikasi WA ke wali yang saldo anaknya di bawah ambang batas pengaturan mereka';

    public function __construct(private readonly GuardianNotificationService $notificationService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $sent = 0;

        Member::where('status', 'active')
            ->with(['guardians' => fn ($q) => $q->where('is_active', true)->whereHas('notificationSetting', fn ($s) => $s->where('low_balance_alert', true))])
            ->whereHas('guardians', fn ($q) => $q->where('is_active', true))
            ->chunkById(200, function ($members) use (&$sent) {
                foreach ($members as $member) {
                    foreach ($member->guardians as $guardian) {
                        $threshold = $guardian->notificationSetting?->low_balance_threshold ?? 20000;

                        if ($member->balance_cache < $threshold) {
                            $this->notificationService->lowBalance($guardian, $member, $member->balance_cache);
                            $sent++;
                        }
                    }
                }
            });

        $this->info("Selesai: {$sent} notifikasi saldo rendah dikirim.");

        return self::SUCCESS;
    }
}
