<?php

namespace App\Observers;

use App\Models\ConsignmentSettlement;
use App\Services\JournalService;

/**
 * T-081. ConsignmentService::markPaid() satu ->update() utuh (setelah
 * CashService::recordOut() — Temuan D-sejenis, sudah diperbaiki
 * sebelumnya) — updated() biasa aman.
 */
class ConsignmentSettlementObserver
{
    public function __construct(private readonly JournalService $journalService) {}

    public function updated(ConsignmentSettlement $settlement): void
    {
        if (! $settlement->wasChanged('status') || $settlement->status !== 'paid' || $settlement->payable_amount <= 0) {
            return;
        }

        $settlement->loadMissing('cashAccount');
        $cashCode = $settlement->cashAccount !== null ? $this->journalService->resolveCashAccountCode($settlement->cashAccount) : '1-1101';

        $entries = [
            ['account_code' => '2-1300', 'debit' => $settlement->payable_amount, 'credit' => 0, 'description' => "Settlement konsinyasi {$settlement->reference}"],
            ['account_code' => $cashCode, 'debit' => 0, 'credit' => $settlement->payable_amount, 'description' => 'Bayar ke pemilik barang konsinyasi'],
        ];

        $this->journalService->record('cash', $entries, $settlement, now(), "Settlement konsinyasi {$settlement->reference}", $settlement->outlet_id);
    }
}
