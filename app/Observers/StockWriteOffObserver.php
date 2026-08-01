<?php

namespace App\Observers;

use App\Models\Journal;
use App\Models\StockWriteOff;
use App\Services\JournalService;

/**
 * T-081. WriteOffService punya DUA pola: process()/createFromReturn()
 * bikin baris draft/approved dulu lalu ->update(status=completed)
 * belakangan (updated() cukup); createFromTransferShortfall() langsung
 * StockWriteOff::create(status=completed) TANPA update() susulan sama
 * sekali (butuh created()). Dengar di keduanya dengan guard idempoten
 * yang sama, bukan ShouldHandleEventsAfterCommit — tidak ada resiko
 * timing anak-tabel di sini (semua kolom yang dibutuhkan sudah ada
 * saat baris StockWriteOff sendiri ditulis).
 *
 * Barang konsinyasi (via stock_layers.is_consignment) TIDAK dijurnal —
 * bukan aset sekolah (ADR-0006, pola sama seperti SaleObserver/
 * SaleReturnObserver).
 */
class StockWriteOffObserver
{
    public function __construct(private readonly JournalService $journalService) {}

    public function created(StockWriteOff $writeOff): void
    {
        $this->maybeJournalize($writeOff);
    }

    public function updated(StockWriteOff $writeOff): void
    {
        $this->maybeJournalize($writeOff);
    }

    private function maybeJournalize(StockWriteOff $writeOff): void
    {
        if ($writeOff->status !== 'completed' || $writeOff->total_cost <= 0) {
            return;
        }

        $alreadyJournaled = Journal::where('sourceable_type', StockWriteOff::class)->where('sourceable_id', $writeOff->id)->exists();

        if ($alreadyJournaled) {
            return;
        }

        $writeOff->loadMissing('stockLayer');

        if ($writeOff->stockLayer?->is_consignment) {
            return;
        }

        $entries = [
            ['account_code' => '6-1100', 'debit' => $writeOff->total_cost, 'credit' => 0, 'description' => "Write-off {$writeOff->reference}: {$writeOff->reason}"],
            ['account_code' => '1-1600', 'debit' => 0, 'credit' => $writeOff->total_cost, 'description' => 'Persediaan write-off'],
        ];

        $this->journalService->record('adjustment', $entries, $writeOff, now(), "Write-off {$writeOff->reference}", $writeOff->outlet_id);
    }
}
