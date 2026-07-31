<?php

namespace App\Console\Commands;

use App\Models\StockLayer;
use Illuminate\Console\Command;

class CheckStockExpiry extends Command
{
    protected $signature = 'stock:check-expiry {--days=7 : Ambang hari mendekati kadaluwarsa}';

    protected $description = 'Deteksi stock_layers yang kadaluwarsa atau akan kadaluwarsa dalam N hari (chunked, aman untuk shared hosting)';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $today = now()->toDateString();
        $threshold = now()->addDays($days)->toDateString();

        $expiredCount = 0;
        $expiringCount = 0;

        StockLayer::query()
            ->where('qty_remaining', '>', 0)
            ->whereNotNull('expired_at')
            ->with(['product:id,name', 'outlet:id,name'])
            ->orderBy('id')
            ->chunkById(500, function ($layers) use ($today, $threshold, &$expiredCount, &$expiringCount) {
                foreach ($layers as $layer) {
                    $expiredAt = $layer->expired_at->toDateString();
                    $label = "{$layer->product->name} @ {$layer->outlet->name} — {$layer->qty_remaining} unit, exp {$expiredAt}".
                        ($layer->batch_no ? " (batch {$layer->batch_no})" : '');

                    if ($expiredAt < $today) {
                        $expiredCount++;
                        $this->error("KADALUWARSA: {$label}");
                    } elseif ($expiredAt <= $threshold) {
                        $expiringCount++;
                        $this->warn("Akan kadaluwarsa: {$label}");
                    }
                }
            });

        $this->info("Selesai: {$expiredCount} layer kadaluwarsa, {$expiringCount} layer akan kadaluwarsa dalam {$days} hari.");

        return self::SUCCESS;
    }
}
