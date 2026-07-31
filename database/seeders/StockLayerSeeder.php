<?php

namespace Database\Seeders;

use App\Models\Outlet;
use App\Models\Product;
use App\Services\StockService;
use Illuminate\Database\Seeder;

class StockLayerSeeder extends Seeder
{
    public function __construct(private readonly StockService $stockService) {}

    public function run(): void
    {
        $outlet = Outlet::where('is_main', true)->firstOrFail();
        $products = Product::with('prices')->get();

        foreach ($products as $index => $product) {
            $price = $product->prices->first()?->price ?? 5000;
            $unitCost = (int) round($price * 0.7);

            // Variasi qty: sebagian di bawah min_stock (kritis), sebagian aman.
            $qty = match ($index % 5) {
                0 => 5,   // di bawah min_stock (10) — kritis
                1 => 8,   // di bawah min_stock — kritis
                default => random_int(20, 80),
            };

            $expiredAt = null;

            if ($product->is_expirable) {
                $expiredAt = match ($index % 7) {
                    0 => now()->subDays(2),       // sudah kadaluwarsa
                    1 => now()->addDays(3),        // akan kadaluwarsa (≤7 hari)
                    default => now()->addMonths(random_int(3, 12)),
                };
            }

            $qtyBefore = $this->stockService->getAvailable($product, $outlet);

            $layer = $this->stockService->addLayer(
                $product,
                $outlet,
                (float) $qty,
                $unitCost,
                $product->is_expirable ? 'BATCH-'.now()->format('Ym').'-'.($index + 1) : null,
                $expiredAt,
            );

            $this->stockService->recordMovement(
                $product,
                $outlet,
                'purchase',
                (float) $qty,
                $qtyBefore,
                $unitCost,
                null,
                'Stok awal (seeder demo)',
                $layer->id,
            );
        }
    }
}
