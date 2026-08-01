<?php

namespace App\Observers;

use App\Models\CashAccount;
use App\Models\Journal;
use App\Models\PurchaseReturn;
use App\Services\JournalService;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

/**
 * T-081. PurchaseService::processReturn() membuat PurchaseReturn::create()
 * dengan status='completed' LANGSUNG lalu item ditulis sesudahnya dalam
 * transaksi yang sama (tanpa update() belakangan) — pola yang sama
 * dengan Purchase/SaleReturn, jadi ShouldHandleEventsAfterCommit +
 * created().
 *
 * Retur pembelian konsinyasi tidak pernah terjadi lewat alur ini
 * (barang konsinyasi tidak pernah jadi Utang Usaha/kas sekolah — kalau
 * dikembalikan ke pemilik itu bagian StockWriteOff/proses lain, bukan
 * PurchaseReturn), jadi tidak perlu guard type=consignment di sini.
 */
class PurchaseReturnObserver implements ShouldHandleEventsAfterCommit
{
    public function __construct(private readonly JournalService $journalService) {}

    public function created(PurchaseReturn $purchaseReturn): void
    {
        $alreadyJournaled = Journal::where('sourceable_type', PurchaseReturn::class)->where('sourceable_id', $purchaseReturn->id)->exists();

        if ($alreadyJournaled || $purchaseReturn->total <= 0) {
            return;
        }

        $purchase = $purchaseReturn->purchase;
        $debitCode = $purchase->payment_type === 'credit' ? '2-1100' : $this->cashAccountCode($purchaseReturn);

        $entries = [
            ['account_code' => $debitCode, 'debit' => $purchaseReturn->total, 'credit' => 0, 'description' => $purchase->payment_type === 'credit' ? 'Pengurang utang usaha' : 'Retur pembelian tunai'],
            ['account_code' => '1-1600', 'debit' => 0, 'credit' => $purchaseReturn->total, 'description' => "Persediaan dari retur pembelian {$purchaseReturn->reference}"],
        ];

        $this->journalService->record('purchase', $entries, $purchaseReturn, $purchaseReturn->return_date, "Retur pembelian {$purchaseReturn->reference}", $purchaseReturn->outlet_id);
    }

    private function cashAccountCode(PurchaseReturn $purchaseReturn): string
    {
        $cashAccount = CashAccount::where('outlet_id', $purchaseReturn->outlet_id)->where('is_default', true)->first()
            ?? CashAccount::where('outlet_id', $purchaseReturn->outlet_id)->first();

        return $cashAccount !== null ? $this->journalService->resolveCashAccountCode($cashAccount) : '1-1101';
    }
}
