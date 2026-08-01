<?php

namespace App\Observers;

use App\Models\StockAdjustment;
use App\Services\JournalService;

/**
 * T-081. StockAdjustmentService::post() satu ->update() utuh —
 * updated() biasa aman. Beda dari Opname (kurang/lebih bisa campur per
 * item dalam satu dokumen), satu StockAdjustment SELALU seragam
 * type=increase atau type=decrease untuk seluruh baris (lihat
 * StockAdjustmentService::request(), $sign dihitung sekali dari
 * $data['type']) — total_value header sudah cukup, tidak perlu query
 * StockMovement seperti StockOpnameObserver.
 */
class StockAdjustmentObserver
{
    public function __construct(private readonly JournalService $journalService) {}

    public function updated(StockAdjustment $adjustment): void
    {
        if (! $adjustment->wasChanged('status') || $adjustment->status !== 'posted' || $adjustment->total_value <= 0) {
            return;
        }

        $entries = $adjustment->type === 'increase'
            ? [
                ['account_code' => '1-1600', 'debit' => $adjustment->total_value, 'credit' => 0, 'description' => "Penyesuaian naik {$adjustment->reference}"],
                ['account_code' => '4-2300', 'debit' => 0, 'credit' => $adjustment->total_value, 'description' => $adjustment->reason],
            ]
            : [
                ['account_code' => '6-1100', 'debit' => $adjustment->total_value, 'credit' => 0, 'description' => $adjustment->reason],
                ['account_code' => '1-1600', 'debit' => 0, 'credit' => $adjustment->total_value, 'description' => "Penyesuaian turun {$adjustment->reference}"],
            ];

        $this->journalService->record('adjustment', $entries, $adjustment, $adjustment->adjustment_date, "Penyesuaian stok {$adjustment->reference}", $adjustment->outlet_id);
    }
}
