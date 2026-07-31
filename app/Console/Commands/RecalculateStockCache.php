<?php

namespace App\Console\Commands;

use App\Models\Outlet;
use App\Models\Product;
use App\Models\StockLayer;
use App\Services\StockService;
use Illuminate\Console\Command;

class RecalculateStockCache extends Command
{
    protected $signature = 'stock:recalculate-cache';

    protected $description = 'Sinkronkan tabel stocks (cache) dari SUM(qty_remaining) stock_layers per produk-outlet';

    public function __construct(private readonly StockService $stockService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $count = 0;

        StockLayer::query()
            ->select('product_id', 'outlet_id')
            ->distinct()
            ->orderBy('product_id')
            ->chunk(200, function ($rows) use (&$count) {
                foreach ($rows as $row) {
                    $product = Product::find($row->product_id);
                    $outlet = Outlet::find($row->outlet_id);

                    if ($product !== null && $outlet !== null) {
                        $this->stockService->recalculateCache($product, $outlet);
                        $count++;
                    }
                }
            });

        $this->info("Selesai: {$count} kombinasi produk-outlet direkonsiliasi.");

        return self::SUCCESS;
    }
}
