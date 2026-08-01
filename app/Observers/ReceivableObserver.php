<?php

namespace App\Observers;

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

        $entries = [
            ['account_code' => '6-1200', 'debit' => $receivable->remaining_amount, 'credit' => 0, 'description' => "Piutang tak tertagih {$receivable->reference}"],
            ['account_code' => '1-1500', 'debit' => 0, 'credit' => $receivable->remaining_amount, 'description' => 'Hapus piutang anggota'],
        ];

        $this->journalService->record('adjustment', $entries, $receivable, now(), "Penghapusan piutang {$receivable->reference}", $receivable->outlet_id);
    }
}
