<?php

namespace App\Services;

use App\Models\Outlet;
use App\Models\Product;
use App\Models\Stock;
use App\Models\StockLayerConsumption;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use App\Models\User;
use App\Support\ReferenceGenerator;
use DomainException;
use Illuminate\Support\Facades\DB;

/**
 * T-075. Transfer stok antar outlet, dua tahap: kirim (FEFO di outlet
 * asal) -> terima (layer baru di outlet tujuan dengan unit_cost/
 * batch_no/expired_at IDENTIK dengan layer sumbernya, bukan HPP baru).
 */
class TransferService
{
    public function __construct(
        private readonly StockService $stockService,
        private readonly WriteOffService $writeOffService,
    ) {}

    /**
     * @param  array{from_outlet_id:int, to_outlet_id:int, transfer_date?:string,
     *     expected_arrival?:string, note?:string,
     *     items: array<int, array{product_id:int, qty:float}>}  $data
     */
    public function create(array $data, User $creator): StockTransfer
    {
        if ($data['from_outlet_id'] === $data['to_outlet_id']) {
            throw new DomainException('Outlet asal dan tujuan tidak boleh sama.');
        }

        return DB::transaction(function () use ($data, $creator) {
            $transfer = StockTransfer::create([
                'reference' => ReferenceGenerator::generate('TF', $data['from_outlet_id']),
                'from_outlet_id' => $data['from_outlet_id'],
                'to_outlet_id' => $data['to_outlet_id'],
                'transfer_date' => $data['transfer_date'] ?? now()->toDateString(),
                'expected_arrival' => $data['expected_arrival'] ?? null,
                'status' => 'draft',
                'created_by' => $creator->id,
                'note' => $data['note'] ?? null,
            ]);

            $totalQty = 0.0;
            $totalValue = 0;

            foreach ($data['items'] as $line) {
                $product = Product::findOrFail($line['product_id']);
                $qty = (float) $line['qty'];
                // Estimasi awal dari avg_cost saat ini — biaya per-layer
                // yang sesungguhnya baru pasti setelah FEFO consume() di
                // send(), item ini diperbarui lagi saat itu.
                $avgCost = (int) (Stock::where('product_id', $product->id)->where('outlet_id', $data['from_outlet_id'])->value('avg_cost') ?? 0);

                StockTransferItem::create([
                    'stock_transfer_id' => $transfer->id,
                    'product_id' => $product->id,
                    'qty_sent' => $qty,
                    'unit_cost' => $avgCost,
                ]);

                $totalQty += $qty;
                $totalValue += (int) round($qty * $avgCost);
            }

            $transfer->update(['total_qty' => $totalQty, 'total_value' => $totalValue]);

            return $transfer->fresh('items');
        });
    }

    public function approve(StockTransfer $transfer, User $approver): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $approver) {
            $locked = StockTransfer::lockForUpdate()->findOrFail($transfer->id);

            if ($locked->status !== 'draft') {
                throw new DomainException('Transfer harus berstatus draft untuk disetujui.');
            }

            $locked->update([
                'status' => 'approved',
                'approved_by' => $approver->id,
                'approved_at' => now(),
            ]);

            return $locked;
        });
    }

    public function send(StockTransfer $transfer, User $sender): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $sender) {
            $locked = StockTransfer::lockForUpdate()->findOrFail($transfer->id);

            if ($locked->status !== 'approved') {
                throw new DomainException('Transfer harus berstatus disetujui untuk dikirim.');
            }

            $fromOutlet = Outlet::findOrFail($locked->from_outlet_id);
            $items = StockTransferItem::where('stock_transfer_id', $locked->id)->with('product')->get();

            foreach ($items as $item) {
                $qtyBefore = $this->stockService->getAvailable($item->product, $fromOutlet);
                $result = $this->stockService->consume($item->product, $fromOutlet, (float) $item->qty_sent, $item);
                $firstConsumption = $result['consumptions']->first();

                $item->update([
                    'unit_cost' => $firstConsumption?->unit_cost ?? $item->unit_cost,
                    'source_layer_id' => $firstConsumption?->stock_layer_id,
                    'batch_no' => $firstConsumption?->stockLayer?->batch_no,
                    'expired_at' => $firstConsumption?->stockLayer?->expired_at,
                ]);

                $this->stockService->recordMovement(
                    $item->product,
                    $fromOutlet,
                    'transfer_out',
                    -(float) $item->qty_sent,
                    $qtyBefore,
                    $firstConsumption?->unit_cost,
                    $locked,
                    "Transfer keluar {$locked->reference}",
                );
            }

            $locked->update([
                'status' => 'in_transit',
                'sent_by' => $sender->id,
                'sent_at' => now(),
            ]);

            return $locked->fresh('items');
        });
    }

    /**
     * @param  array<int, array{stock_transfer_item_id:int, qty_received:float}>  $receivedLines
     */
    public function receive(StockTransfer $transfer, array $receivedLines, User $receiver): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $receivedLines, $receiver) {
            $locked = StockTransfer::lockForUpdate()->findOrFail($transfer->id);

            if ($locked->status !== 'in_transit') {
                throw new DomainException('Transfer harus berstatus dalam perjalanan untuk diterima.');
            }

            $toOutlet = Outlet::findOrFail($locked->to_outlet_id);
            $receivedByItemId = collect($receivedLines)->keyBy('stock_transfer_item_id');
            $items = StockTransferItem::where('stock_transfer_id', $locked->id)->with('product')->get();
            $anyShort = false;

            foreach ($items as $item) {
                $qtyReceived = (float) ($receivedByItemId[$item->id]['qty_received'] ?? 0);

                if ($qtyReceived > (float) $item->qty_sent + 1e-9) {
                    throw new DomainException("Qty diterima untuk \"{$item->product->name}\" melebihi qty yang dikirim.");
                }

                // FEFO di sisi kirim bisa menyentuh beberapa layer sumber
                // (batch berbeda) — tiap consumption dibuatkan layer
                // tujuan sendiri supaya unit_cost/batch_no/expired_at
                // tetap identik per-batch (bukan diblender jadi satu).
                $consumptions = StockLayerConsumption::where('consumableable_type', StockTransferItem::class)
                    ->where('consumableable_id', $item->id)
                    ->orderBy('id')
                    ->get();

                $remaining = $qtyReceived;
                $firstDestinationLayer = null;

                foreach ($consumptions as $consumption) {
                    if ($remaining <= 0) {
                        break;
                    }

                    $take = min((float) $consumption->qty, $remaining);
                    $sourceLayer = $consumption->stockLayer;

                    $qtyBefore = $this->stockService->getAvailable($item->product, $toOutlet);
                    $destinationLayer = $this->stockService->addLayer(
                        $item->product,
                        $toOutlet,
                        $take,
                        $sourceLayer->unit_cost,
                        $sourceLayer->batch_no,
                        $sourceLayer->expired_at,
                        $item,
                    );

                    $this->stockService->recordMovement(
                        $item->product,
                        $toOutlet,
                        'transfer_in',
                        $take,
                        $qtyBefore,
                        $sourceLayer->unit_cost,
                        $locked,
                        "Transfer masuk {$locked->reference}",
                    );

                    $firstDestinationLayer ??= $destinationLayer;
                    $remaining -= $take;
                }

                $item->update([
                    'qty_received' => $qtyReceived,
                    'destination_layer_id' => $firstDestinationLayer?->id,
                ]);

                $shortQty = (float) $item->qty_sent - $qtyReceived;

                if ($shortQty > 1e-9) {
                    $anyShort = true;
                    $this->writeOffService->createFromTransferShortfall($item, $shortQty, $receiver);
                }
            }

            $locked->update([
                'status' => $anyShort ? 'partial' : 'received',
                'received_by' => $receiver->id,
                'received_at' => now(),
            ]);

            return $locked->fresh('items');
        });
    }

    public function cancel(StockTransfer $transfer, User $canceller): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $canceller) {
            $locked = StockTransfer::lockForUpdate()->findOrFail($transfer->id);

            if (! in_array($locked->status, ['draft', 'approved'], true)) {
                throw new DomainException('Transfer yang sudah dikirim tidak bisa dibatalkan — stok sudah bergerak.');
            }

            $locked->update([
                'status' => 'cancelled',
                'note' => trim(($locked->note ? $locked->note.' ' : '').'Dibatalkan oleh '.$canceller->name.'.'),
            ]);

            return $locked;
        });
    }
}
