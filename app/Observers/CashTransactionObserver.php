<?php

namespace App\Observers;

use App\Models\CashTransaction;
use App\Services\JournalService;

/**
 * T-081 (Fase 13 §Temuan L). Hanya menjurnal CashTransaction yang
 * TIDAK punya sourceable (kas masuk/keluar MANUAL lewat CashController,
 * drop cash, setor bank) — CashTransaction yang lahir dari
 * PurchaseReturn::processReturn() (Temuan D) atau
 * ConsignmentSettlement::markPaid() SUDAH dijurnal lengkap oleh
 * observer masing-masing (PurchaseReturnObserver,
 * ConsignmentSettlementObserver); menjurnal lagi di sini akan
 * dobel-hitung sisi Persediaan/Utang Konsinyasi yang tidak
 * tersedia dari data CashTransaction saja.
 *
 * CashService::recordIn/recordOut/transfer masing-masing satu
 * create() utuh — created() biasa aman.
 */
class CashTransactionObserver
{
    public function __construct(private readonly JournalService $journalService) {}

    public function created(CashTransaction $trx): void
    {
        if ($trx->sourceable_type !== null || $trx->amount <= 0) {
            return;
        }

        $entries = match ($trx->type) {
            'in' => $this->inOutEntries($trx, debitCash: true),
            'out' => $this->inOutEntries($trx, debitCash: false),
            'transfer' => $this->transferEntries($trx),
            default => null,
        };

        if ($entries === null) {
            return;
        }

        $this->journalService->record('cash', $entries, $trx, $trx->transaction_date, "Kas {$trx->type} {$trx->reference}", $trx->outlet_id);
    }

    private function inOutEntries(CashTransaction $trx, bool $debitCash): ?array
    {
        $trx->loadMissing(['cashAccount', 'cashCategory']);
        $categoryCode = $trx->cashCategory?->account_code;

        if ($categoryCode === null) {
            return null;
        }

        $cashCode = $this->journalService->resolveCashAccountCode($trx->cashAccount);

        return $debitCash
            ? [
                ['account_code' => $cashCode, 'debit' => $trx->amount, 'credit' => 0, 'description' => $trx->description],
                ['account_code' => $categoryCode, 'debit' => 0, 'credit' => $trx->amount, 'description' => $trx->cashCategory->name],
            ]
            : [
                ['account_code' => $categoryCode, 'debit' => $trx->amount, 'credit' => 0, 'description' => $trx->cashCategory->name],
                ['account_code' => $cashCode, 'debit' => 0, 'credit' => $trx->amount, 'description' => $trx->description],
            ];
    }

    private function transferEntries(CashTransaction $trx): ?array
    {
        $trx->loadMissing(['cashAccount', 'transferToAccount']);

        if ($trx->transferToAccount === null) {
            return null;
        }

        return [
            ['account_code' => $this->journalService->resolveCashAccountCode($trx->transferToAccount), 'debit' => $trx->amount, 'credit' => 0, 'description' => $trx->description],
            ['account_code' => $this->journalService->resolveCashAccountCode($trx->cashAccount), 'debit' => 0, 'credit' => $trx->amount, 'description' => $trx->description],
        ];
    }
}
