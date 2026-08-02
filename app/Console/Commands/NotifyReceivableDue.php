<?php

namespace App\Console\Commands;

use App\Models\Receivable;
use App\Services\GuardianNotificationService;
use Illuminate\Console\Command;

/**
 * T-100 (Fase 16, judul tiket INDEX.md eksplisit "piutang jatuh
 * tempo" — spec Livewire asli tidak punya command terpisah untuk ini,
 * hanya low-balance/weekly-summary/birthday. Ditambahkan supaya
 * cakupan tiket resmi terpenuhi, bukan cuma spec lama).
 */
class NotifyReceivableDue extends Command
{
    protected $signature = 'notify:receivable-due';

    protected $description = 'Kirim notifikasi WA ke wali untuk piutang anak yang jatuh tempo dalam 3 hari';

    public function __construct(private readonly GuardianNotificationService $notificationService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $sent = 0;
        $threshold = now()->addDays(3)->toDateString();

        Receivable::whereIn('status', ['unpaid', 'partial'])
            ->where('due_date', '<=', $threshold)
            ->with(['member.guardians' => fn ($q) => $q->where('is_active', true)])
            ->chunkById(200, function ($receivables) use (&$sent) {
                foreach ($receivables as $receivable) {
                    if (! $receivable->member) {
                        continue;
                    }

                    foreach ($receivable->member->guardians as $guardian) {
                        $this->notificationService->receivableDue($guardian, $receivable->member, $receivable->remaining_amount, $receivable->due_date->format('d M Y'));
                        $sent++;
                    }
                }
            });

        $this->info("Selesai: {$sent} notifikasi piutang jatuh tempo dikirim.");

        return self::SUCCESS;
    }
}
