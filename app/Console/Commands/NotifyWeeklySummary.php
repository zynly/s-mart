<?php

namespace App\Console\Commands;

use App\Models\Member;
use App\Models\Sale;
use App\Services\GuardianNotificationService;
use Illuminate\Console\Command;

class NotifyWeeklySummary extends Command
{
    protected $signature = 'notify:weekly-summary';

    protected $description = 'Kirim ringkasan belanja mingguan ke wali yang mengaktifkan pengaturan ini';

    public function __construct(private readonly GuardianNotificationService $notificationService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $sent = 0;
        $since = now()->subDays(7);

        Member::where('status', 'active')
            ->with(['guardians' => fn ($q) => $q->where('is_active', true)->whereHas('notificationSetting', fn ($s) => $s->where('weekly_summary', true))])
            ->whereHas('guardians', fn ($q) => $q->where('is_active', true))
            ->chunkById(200, function ($members) use (&$sent, $since) {
                foreach ($members as $member) {
                    if ($member->guardians->isEmpty()) {
                        continue;
                    }

                    $summary = Sale::where('member_id', $member->id)
                        ->where('status', 'completed')
                        ->where('sale_date', '>=', $since)
                        ->selectRaw('COUNT(*) as transaksi, COALESCE(SUM(grand_total), 0) as total')
                        ->first();

                    if ((int) $summary->transaksi === 0) {
                        continue;
                    }

                    foreach ($member->guardians as $guardian) {
                        $this->notificationService->weeklySummary($guardian, $member, (int) $summary->total, (int) $summary->transaksi);
                        $sent++;
                    }
                }
            });

        $this->info("Selesai: {$sent} ringkasan mingguan dikirim.");

        return self::SUCCESS;
    }
}
