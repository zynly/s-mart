<?php

namespace App\Observers;

use App\Models\CashAccount;
use App\Models\Journal;
use App\Models\Purchase;
use App\Services\JournalService;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

/**
 * T-081. PurchaseService::receive() membuat Purchase::create() dengan
 * status='received' LANGSUNG lalu item/other cost ditulis SESUDAHNYA
 * dalam transaksi yang sama (tidak ada update() belakangan) — pola yang
 * sama persis dengan SaleReturn, jadi dengar lewat ShouldHandleEvents
 * AfterCommit + created() (bukan pola created()+updated() SaleObserver).
 *
 * Konsinyasi (type=consignment): TIDAK ADA JURNAL sama sekali saat
 * terima barang (ADR-0006) — barang belum jadi milik/hutang sekolah,
 * baru diakui saat terjual (SaleObserver) & settlement.
 */
class PurchaseObserver implements ShouldHandleEventsAfterCommit
{
    public function __construct(private readonly JournalService $journalService) {}

    public function created(Purchase $purchase): void
    {
        if ($purchase->type === 'consignment') {
            return;
        }

        $alreadyJournaled = Journal::where('sourceable_type', Purchase::class)->where('sourceable_id', $purchase->id)->exists();

        if ($alreadyJournaled || $purchase->total <= 0) {
            return;
        }

        $creditCode = $purchase->payment_type === 'credit'
            ? '2-1100'
            : $this->cashAccountCode($purchase);

        $entries = [
            ['account_code' => '1-1600', 'debit' => $purchase->total, 'credit' => 0, 'description' => "Persediaan dari pembelian {$purchase->reference}"],
            ['account_code' => $creditCode, 'debit' => 0, 'credit' => $purchase->total, 'description' => $purchase->payment_type === 'credit' ? 'Utang usaha' : 'Pembelian tunai'],
        ];

        $this->journalService->record('purchase', $entries, $purchase, $purchase->purchase_date, "Pembelian {$purchase->reference}", $purchase->outlet_id);
    }

    private function cashAccountCode(Purchase $purchase): string
    {
        $cashAccount = CashAccount::where('outlet_id', $purchase->outlet_id)->where('is_default', true)->first()
            ?? CashAccount::where('outlet_id', $purchase->outlet_id)->first();

        return $cashAccount !== null ? $this->journalService->resolveCashAccountCode($cashAccount) : '1-1101';
    }
}
