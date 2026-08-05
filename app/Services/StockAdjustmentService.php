<?php

namespace App\Services;

use App\Models\Outlet;
use App\Models\Product;
use App\Models\Stock;
use App\Models\StockAdjustment;
use App\Models\StockAdjustmentItem;
use App\Models\StockLayer;
use App\Models\User;
use App\Support\ReferenceGenerator;
use DomainException;
use Illuminate\Support\Facades\DB;

/**
 * Bagian T-073/T-077 di luar judul ringkas tiket (ada di spec detail
 * §TABEL/SERVICE/HALAMAN Fase 12). Beda dari opname (blind count
 * massal), penyesuaian adalah koreksi TERTARGET satu per satu — untuk
 * pengurangan, layer sumbernya dipilih eksplisit oleh pemohon (bukan
 * FEFO otomatis), karena biasanya orang sudah tahu persis batch mana
 * yang rusak/salah catat.
 */
class StockAdjustmentService
{
    public function __construct(private readonly StockService $stockService) {}

    /**
     * @param  array{outlet_id:int, adjustment_date?:string, type:string, reason:string,
     *     items: array<int, array{product_id:int, qty:float, stock_layer_id?:int, note?:string}>}  $data
     */
    public function request(array $data, User $requester): StockAdjustment
    {
        return DB::transaction(function () use ($data, $requester) {
            $adjustment = StockAdjustment::create([
                'reference' => ReferenceGenerator::generate('ADJ', $data['outlet_id']),
                'outlet_id' => $data['outlet_id'],
                'adjustment_date' => $data['adjustment_date'] ?? now()->toDateString(),
                'type' => $data['type'],
                'reason' => $data['reason'],
                'status' => 'draft',
                'requested_by' => $requester->id,
            ]);

            $sign = $data['type'] === 'increase' ? 1 : -1;
            $totalValue = 0;

            foreach ($data['items'] as $line) {
                $product = Product::findOrFail($line['product_id']);
                $qty = abs((float) $line['qty']) * $sign;
                $layer = isset($line['stock_layer_id']) ? StockLayer::find($line['stock_layer_id']) : null;

                if ($data['type'] === 'decrease') {
                    if ($layer === null) {
                        throw new DomainException("Pilih layer stok spesifik untuk pengurangan \"{$product->name}\".");
                    }

                    // Audit Fase 6 (Temuan Tinggi): layer yang dipilih
                    // sebelumnya tidak pernah diverifikasi cocok dengan
                    // outlet/produk header penyesuaian — layer produk/
                    // outlet LAIN bisa dipakai (isolasi multi-outlet bocor).
                    if ((int) $layer->outlet_id !== (int) $data['outlet_id'] || (int) $layer->product_id !== $product->id) {
                        throw new DomainException("Layer stok yang dipilih tidak cocok dengan produk/outlet penyesuaian \"{$product->name}\".");
                    }

                    if ((float) $layer->qty_remaining < abs($qty)) {
                        throw new DomainException("Qty pengurangan untuk \"{$product->name}\" melebihi sisa layer yang dipilih ({$layer->qty_remaining}).");
                    }
                }

                $unitCost = $layer->unit_cost
                    ?? (int) (Stock::where('product_id', $product->id)->where('outlet_id', $data['outlet_id'])->value('avg_cost') ?? 0);
                $totalCost = (int) round(abs($qty) * $unitCost);

                StockAdjustmentItem::create([
                    'stock_adjustment_id' => $adjustment->id,
                    'product_id' => $product->id,
                    'qty' => $qty,
                    'unit_cost' => $unitCost,
                    'total_cost' => $totalCost,
                    'stock_layer_id' => $layer?->id,
                    'note' => $line['note'] ?? null,
                ]);

                $totalValue += $totalCost;
            }

            $adjustment->update(['total_value' => $totalValue]);

            return $adjustment->fresh('items');
        });
    }

    public function approve(StockAdjustment $adjustment, User $approver): StockAdjustment
    {
        return DB::transaction(function () use ($adjustment, $approver) {
            $locked = StockAdjustment::lockForUpdate()->findOrFail($adjustment->id);

            if ($locked->status !== 'draft') {
                throw new DomainException('Penyesuaian harus berstatus draft untuk disetujui.');
            }

            $locked->update([
                'status' => 'approved',
                'approved_by' => $approver->id,
                'approved_at' => now(),
            ]);

            return $locked;
        });
    }

    public function post(StockAdjustment $adjustment): StockAdjustment
    {
        return DB::transaction(function () use ($adjustment) {
            $locked = StockAdjustment::lockForUpdate()->findOrFail($adjustment->id);

            if ($locked->status !== 'approved') {
                throw new DomainException('Penyesuaian harus berstatus disetujui untuk diposting.');
            }

            $outlet = Outlet::findOrFail($locked->outlet_id);
            $items = StockAdjustmentItem::where('stock_adjustment_id', $locked->id)->with(['product', 'stockLayer'])->get();

            foreach ($items as $item) {
                $qtyBefore = $this->stockService->getAvailable($item->product, $outlet);

                if ((float) $item->qty > 0) {
                    $this->stockService->addLayer($item->product, $outlet, (float) $item->qty, $item->unit_cost, source: $locked);
                } else {
                    $this->stockService->reduceLayer($item->stockLayer, abs((float) $item->qty));
                }

                $this->stockService->recordMovement(
                    $item->product,
                    $outlet,
                    'adjustment',
                    (float) $item->qty,
                    $qtyBefore,
                    $item->unit_cost,
                    $locked,
                    "Penyesuaian: {$locked->reason}",
                    $item->stock_layer_id,
                );
            }

            $locked->update(['status' => 'posted']);

            return $locked->fresh('items');
        });
    }
}
