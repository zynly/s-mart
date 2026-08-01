<?php

namespace App\Observers;

use App\Models\CashierSession;
use App\Services\JournalService;

/**
 * T-081. CashierSessionService::close() satu ->update() utuh — updated()
 * biasa aman. Hanya selisih != 0 yang dijurnal (Fase 13 §Temuan L).
 */
class CashierSessionObserver
{
    public function __construct(private readonly JournalService $journalService) {}

    public function updated(CashierSession $session): void
    {
        if (! $session->wasChanged('status') || $session->status !== 'closed' || $session->difference === 0) {
            return;
        }

        $session->loadMissing('cashAccount');
        $cashCode = $this->journalService->resolveCashAccountCode($session->cashAccount);
        $amount = abs($session->difference);

        $entries = $session->difference > 0
            ? [
                ['account_code' => $cashCode, 'debit' => $amount, 'credit' => 0, 'description' => "Selisih kas lebih sesi {$session->reference}"],
                ['account_code' => '4-2100', 'debit' => 0, 'credit' => $amount, 'description' => 'Selisih kas lebih'],
            ]
            : [
                ['account_code' => '6-1500', 'debit' => $amount, 'credit' => 0, 'description' => "Selisih kas kurang sesi {$session->reference}"],
                ['account_code' => $cashCode, 'debit' => 0, 'credit' => $amount, 'description' => 'Selisih kas kurang'],
            ];

        $this->journalService->record('adjustment', $entries, $session, now(), "Selisih kas {$session->reference}", $session->outlet_id);
    }
}
