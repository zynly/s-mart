<?php

namespace App\Observers;

use App\Models\StockMovement;
use App\Models\StockOpname;
use App\Services\JournalService;

/**
 * T-081. OpnameService::post() satu ->update() utuh di akhir —
 * updated() biasa aman. Nilai kurang/lebih diambil dari StockMovement
 * (type=opname, sourceable=opname ini) yang SUDAH ditulis post() itu
 * sendiri, bukan dihitung ulang dari StockOpnameItem.variance_qty —
 * post() menyesuaikan variance mentah dengan movementSinceCutoff
 * sebelum benar-benar memposting, jadi StockMovement adalah satu-
 * satunya sumber kebenaran untuk qty yang BENAR-BENAR diposting.
 */
class StockOpnameObserver
{
    public function __construct(private readonly JournalService $journalService) {}

    public function updated(StockOpname $opname): void
    {
        if (! $opname->wasChanged('status') || $opname->status !== 'posted') {
            return;
        }

        $movements = StockMovement::where('sourceable_type', StockOpname::class)
            ->where('sourceable_id', $opname->id)
            ->where('type', 'opname')
            ->get();

        $shortage = (int) $movements->where('qty', '<', 0)->sum('total_cost');
        $surplus = (int) $movements->where('qty', '>', 0)->sum('total_cost');

        if ($shortage <= 0 && $surplus <= 0) {
            return;
        }

        $entries = [];

        if ($shortage > 0) {
            $entries[] = ['account_code' => '6-1100', 'debit' => $shortage, 'credit' => 0, 'description' => "Opname kurang {$opname->reference}"];
            $entries[] = ['account_code' => '1-1600', 'debit' => 0, 'credit' => $shortage, 'description' => 'Persediaan berkurang (opname)'];
        }

        if ($surplus > 0) {
            $entries[] = ['account_code' => '1-1600', 'debit' => $surplus, 'credit' => 0, 'description' => 'Persediaan bertambah (opname)'];
            $entries[] = ['account_code' => '4-2300', 'debit' => 0, 'credit' => $surplus, 'description' => "Opname lebih {$opname->reference}"];
        }

        $this->journalService->record('adjustment', $entries, $opname, $opname->opname_date, "Stock opname {$opname->reference}", $opname->outlet_id);
    }
}
