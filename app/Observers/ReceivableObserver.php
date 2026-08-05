<?php

namespace App\Observers;

use App\Models\Journal;
use App\Models\Receivable;
use App\Services\JournalService;

/**
 * T-081. Hanya transisi status->written_off yang dijurnal di sini
 * (Fase 13 §Temuan L). Transisi status->cancelled (dari VoidService::
 * cancelFromVoid, dipicu saat nota kredit induknya di-void) SENGAJA
 * di-skip — piutang itu bagian dari jurnal Sale asli yang sudah
 * dibalik utuh oleh reversing journal Void (Temuan I), menjurnal lagi
 * di sini akan dobel-hitung.
 */
class ReceivableObserver
{
    public function __construct(private readonly JournalService $journalService) {}

    public function updated(Receivable $receivable): void
    {
        if (! $receivable->wasChanged('status') || $receivable->status !== 'written_off') {
            return;
        }

        if ($receivable->remaining_amount <= 0) {
            return;
        }

        // Audit Fase 7 (Temuan Rendah): satu-satunya observer status-driven
        // tanpa guard idempoten eksplisit seperti yang lain (Purchase/
        // StockWriteOff/dst) — sebelumnya cuma terlindungi TIDAK LANGSUNG
        // lewat soft-delete di ReceivableService::writeOff(). Pola sama
        // seperti observer lain dipasang di sini juga, supaya tidak
        // bergantung pada detail implementasi service yang bisa berubah.
        $alreadyJournaled = Journal::where('sourceable_type', Receivable::class)->where('sourceable_id', $receivable->id)->exists();

        if ($alreadyJournaled) {
            return;
        }

        $entries = [
            ['account_code' => '6-1200', 'debit' => $receivable->remaining_amount, 'credit' => 0, 'description' => "Piutang tak tertagih {$receivable->reference}"],
            ['account_code' => '1-1500', 'debit' => 0, 'credit' => $receivable->remaining_amount, 'description' => 'Hapus piutang anggota'],
        ];

        $this->journalService->record('adjustment', $entries, $receivable, now(), "Penghapusan piutang {$receivable->reference}", $receivable->outlet_id);
    }
}
