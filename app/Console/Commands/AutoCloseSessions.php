<?php

namespace App\Console\Commands;

use App\Models\CashierSession;
use App\Services\CashierSessionService;
use Illuminate\Console\Command;

class AutoCloseSessions extends Command
{
    protected $signature = 'session:auto-close';

    protected $description = 'Tutup paksa sesi kasir yang masih terbuka (lupa ditutup) — actual_cash disamakan expected_cash, status force_closed';

    public function __construct(private readonly CashierSessionService $sessionService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $count = 0;

        CashierSession::where('status', 'open')
            ->orderBy('id')
            ->chunkById(200, function ($sessions) use (&$count) {
                foreach ($sessions as $session) {
                    $this->sessionService->forceClose($session);
                    $count++;
                    $this->warn("Sesi {$session->reference} (user #{$session->user_id}) ditutup paksa.");
                }
            });

        $this->info($count === 0 ? 'Tidak ada sesi terbuka.' : "Selesai: {$count} sesi ditutup paksa.");

        return self::SUCCESS;
    }
}
