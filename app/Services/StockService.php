<?php

namespace App\Services;

use App\Exceptions\InsufficientStockException;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\Stock;
use App\Models\StockLayer;
use App\Models\StockLayerConsumption;
use App\Models\StockMovement;
use App\Support\ReferenceGenerator;
use DomainException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class StockService
{
    public function addLayer(
        Product $product,
        Outlet $outlet,
        float $qty,
        int $unitCost,
        ?string $batchNo = null,
        ?Carbon $expiredAt = null,
        ?Model $source = null,
        bool $isConsignment = false,
        ?int $supplierId = null,
    ): StockLayer {
        return DB::transaction(function () use ($product, $outlet, $qty, $unitCost, $batchNo, $expiredAt, $source, $isConsignment, $supplierId) {
            $layer = StockLayer::create([
                'product_id' => $product->id,
                'outlet_id' => $outlet->id,
                'qty_in' => $qty,
                'qty_remaining' => $qty,
                'unit_cost' => $unitCost,
                'batch_no' => $batchNo,
                'expired_at' => $expiredAt,
                'received_at' => now(),
                'sourceable_type' => $source?->getMorphClass(),
                'sourceable_id' => $source?->getKey(),
                'is_consignment' => $isConsignment,
                'supplier_id' => $supplierId,
            ]);

            $this->recalculateCache($product, $outlet);

            return $layer;
        });
    }

    /**
     * Konsumsi stok FEFO: expired_at ASC (NULL di akhir), lalu received_at
     * ASC. Tidak membuat stock_movements — itu tugas pemanggil
     * (SaleService, dst) yang tahu konteks tipe pergerakannya.
     *
     * @return array{total_cost: int, consumptions: \Illuminate\Support\Collection<int, StockLayerConsumption>}
     */
    public function consume(Product $product, Outlet $outlet, float $qty, ?Model $consumer = null): array
    {
        return DB::transaction(function () use ($product, $outlet, $qty, $consumer) {
            $layers = StockLayer::query()
                ->where('product_id', $product->id)
                ->where('outlet_id', $outlet->id)
                ->where('qty_remaining', '>', 0)
                ->orderByRaw('(expired_at IS NULL) ASC, expired_at ASC, received_at ASC')
                ->lockForUpdate()
                ->get();

            $available = (float) $layers->sum('qty_remaining');

            if ($available < $qty) {
                throw InsufficientStockException::make($product->name, $available, $qty);
            }

            $remaining = $qty;
            $totalCost = 0;
            $consumptions = collect();

            foreach ($layers as $layer) {
                if ($remaining <= 0) {
                    break;
                }

                $take = min((float) $layer->qty_remaining, $remaining);

                if ($take <= 0) {
                    continue;
                }

                $layer->decrement('qty_remaining', $take);

                $lineCost = (int) round($take * $layer->unit_cost);
                $totalCost += $lineCost;

                $consumptions->push(StockLayerConsumption::create([
                    'stock_layer_id' => $layer->id,
                    'qty' => $take,
                    'unit_cost' => $layer->unit_cost,
                    'total_cost' => $lineCost,
                    'consumableable_type' => $consumer?->getMorphClass(),
                    'consumableable_id' => $consumer?->getKey(),
                ]));

                $remaining -= $take;
            }

            $this->recalculateCache($product, $outlet);

            return ['total_cost' => $totalCost, 'consumptions' => $consumptions];
        });
    }

    /**
     * Kembalikan qty ke layer asal (bukan bikin layer baru). Aman
     * dipanggil berkali-kali dengan qty parsial atas consumption yang
     * sama (retur sebagian) — qty_returned kumulatif dijaga tidak
     * pernah menembus qty konsumsi asal (Fase 11 / T-069).
     */
    public function returnToLayer(StockLayerConsumption $consumption, float $qty): void
    {
        DB::transaction(function () use ($consumption, $qty) {
            $lockedConsumption = StockLayerConsumption::lockForUpdate()->findOrFail($consumption->id);
            $layer = StockLayer::lockForUpdate()->findOrFail($lockedConsumption->stock_layer_id);

            $newQtyReturned = (float) $lockedConsumption->qty_returned + $qty;

            if ($newQtyReturned > (float) $lockedConsumption->qty) {
                throw new DomainException('Qty retur melebihi qty yang pernah dikonsumsi dari layer ini.');
            }

            $layer->increment('qty_remaining', $qty);

            $lockedConsumption->update([
                'qty_returned' => $newQtyReturned,
                'is_returned' => $newQtyReturned >= (float) $lockedConsumption->qty,
            ]);

            $this->recalculateCache($layer->product, $layer->outlet);
        });
    }

    /**
     * Kurangi qty_remaining sebuah layer secara langsung — dipakai retur
     * pembelian ke supplier (bukan penjualan, jadi bukan lewat FEFO
     * consume() yang memilihkan layer sendiri; di sini layer sudah pasti
     * diketahui dari purchase_item yang diretur).
     */
    public function reduceLayer(StockLayer $layer, float $qty): void
    {
        DB::transaction(function () use ($layer, $qty) {
            $locked = StockLayer::lockForUpdate()->findOrFail($layer->id);

            if ((float) $locked->qty_remaining < $qty) {
                throw InsufficientStockException::make($locked->product->name, (float) $locked->qty_remaining, $qty);
            }

            $locked->decrement('qty_remaining', $qty);
            $this->recalculateCache($locked->product, $locked->outlet);
        });
    }

    /**
     * $qtyBefore wajib diambil pemanggil (mis. via getAvailable()) SEBELUM
     * memanggil addLayer()/consume() — StockService sudah memutakhirkan
     * cache stocks di dalam kedua method itu, jadi membaca cache di sini
     * (setelah mutasi terjadi) akan salah menghasilkan qty_before yang
     * sebenarnya sudah jadi qty_after.
     */
    public function recordMovement(
        Product $product,
        Outlet $outlet,
        string $type,
        float $qty,
        float $qtyBefore,
        ?int $unitCost = null,
        ?Model $source = null,
        ?string $note = null,
        ?int $stockLayerId = null,
    ): StockMovement {
        $after = $qtyBefore + $qty;

        return StockMovement::create([
            'reference' => ReferenceGenerator::generate('STK', $outlet->id),
            'product_id' => $product->id,
            'outlet_id' => $outlet->id,
            'type' => $type,
            'qty' => $qty,
            'qty_before' => $qtyBefore,
            'qty_after' => $after,
            'unit_cost' => $unitCost,
            'total_cost' => $unitCost !== null ? (int) round(abs($qty) * $unitCost) : null,
            'stock_layer_id' => $stockLayerId,
            'sourceable_type' => $source?->getMorphClass(),
            'sourceable_id' => $source?->getKey(),
            'user_id' => auth()->id(),
            'note' => $note,
        ]);
    }

    public function recalculateCache(Product $product, Outlet $outlet): void
    {
        $layers = StockLayer::where('product_id', $product->id)
            ->where('outlet_id', $outlet->id)
            ->where('qty_remaining', '>', 0)
            ->get();

        $qty = (float) $layers->sum('qty_remaining');
        $totalValue = $layers->sum(fn (StockLayer $l) => (float) $l->qty_remaining * $l->unit_cost);
        $avgCost = $qty > 0 ? (int) round($totalValue / $qty) : 0;

        $lastLayer = StockLayer::where('product_id', $product->id)
            ->where('outlet_id', $outlet->id)
            ->orderByDesc('received_at')
            ->first();

        Stock::updateOrCreate(
            ['product_id' => $product->id, 'outlet_id' => $outlet->id],
            [
                'qty' => $qty,
                'avg_cost' => $avgCost,
                'last_cost' => $lastLayer->unit_cost ?? 0,
                'last_movement_at' => now(),
            ],
        );
    }

    public function getAvailable(Product $product, Outlet $outlet): float
    {
        return (float) (Stock::where('product_id', $product->id)->where('outlet_id', $outlet->id)->value('qty') ?? 0);
    }

    /**
     * @return Collection<int, StockLayer>
     */
    public function getExpiringSoon(Outlet $outlet, int $days): Collection
    {
        return StockLayer::where('outlet_id', $outlet->id)
            ->where('qty_remaining', '>', 0)
            ->whereNotNull('expired_at')
            ->whereBetween('expired_at', [now()->toDateString(), now()->addDays($days)->toDateString()])
            ->orderBy('expired_at')
            ->get();
    }

    /**
     * @return Collection<int, StockLayer>
     */
    public function getExpired(Outlet $outlet): Collection
    {
        return StockLayer::where('outlet_id', $outlet->id)
            ->where('qty_remaining', '>', 0)
            ->whereNotNull('expired_at')
            ->where('expired_at', '<', now()->toDateString())
            ->orderBy('expired_at')
            ->get();
    }
}
