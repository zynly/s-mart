<?php

namespace App\Services;

use App\Models\CashAccount;
use App\Models\ConsignmentSettlement;
use App\Models\ConsignmentSettlementItem;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\StockLayer;
use App\Models\StockLayerConsumption;
use App\Models\Supplier;
use App\Models\User;
use App\Support\ReferenceGenerator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ConsignmentService
{
    public function __construct(
        private readonly PriceService $priceService,
        private readonly StockService $stockService,
        private readonly CashService $cashService,
    ) {}

    /**
     * Hitung barang konsinyasi terjual (via stock_layer_consumptions pada
     * layer is_consignment) dalam periode, pakai harga jual aktif produk
     * (belum ada Sale/SaleItem sampai Fase 8 — ini pendekatan terbaik yang
     * tersedia sekarang; bisa disempurnakan pakai harga baris nota asli
     * begitu Fase 8/9 selesai).
     *
     * @return array{items: array<int, array<string, mixed>>, total_sold: int, commission_amount: int, payable_amount: int}
     */
    public function calculateSettlement(Supplier $supplier, Outlet $outlet, Carbon $periodStart, Carbon $periodEnd, float $commissionPercent): array
    {
        $layerIds = StockLayer::where('supplier_id', $supplier->id)
            ->where('outlet_id', $outlet->id)
            ->where('is_consignment', true)
            ->pluck('id');

        $consumptionsByProduct = StockLayerConsumption::query()
            ->join('stock_layers', 'stock_layers.id', '=', 'stock_layer_consumptions.stock_layer_id')
            ->whereIn('stock_layer_consumptions.stock_layer_id', $layerIds)
            ->whereBetween('stock_layer_consumptions.created_at', [$periodStart, $periodEnd])
            ->select('stock_layer_consumptions.qty', 'stock_layers.product_id')
            ->get()
            ->groupBy('product_id');

        $items = [];
        $totalSold = 0;
        $totalCommission = 0;

        foreach ($consumptionsByProduct as $productId => $group) {
            $product = Product::findOrFail($productId);
            $qtySold = (float) $group->sum('qty');
            $price = $this->priceService->getActivePrice($product, $outlet, $product->baseUnit);
            $totalPrice = (int) round($qtySold * $price);
            $commission = (int) round($totalPrice * $commissionPercent / 100);

            $items[] = [
                'product_id' => (int) $productId,
                'qty_sold' => $qtySold,
                'unit_price' => $price,
                'total_price' => $totalPrice,
                'commission' => $commission,
                'payable' => $totalPrice - $commission,
            ];

            $totalSold += $totalPrice;
            $totalCommission += $commission;
        }

        return [
            'items' => $items,
            'total_sold' => $totalSold,
            'commission_amount' => $totalCommission,
            'payable_amount' => $totalSold - $totalCommission,
        ];
    }

    public function settle(Supplier $supplier, Outlet $outlet, Carbon $periodStart, Carbon $periodEnd, float $commissionPercent): ConsignmentSettlement
    {
        return DB::transaction(function () use ($supplier, $outlet, $periodStart, $periodEnd, $commissionPercent) {
            $calc = $this->calculateSettlement($supplier, $outlet, $periodStart, $periodEnd, $commissionPercent);

            $settlement = ConsignmentSettlement::create([
                'reference' => ReferenceGenerator::generate('KON', $outlet->id),
                'supplier_id' => $supplier->id,
                'outlet_id' => $outlet->id,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'total_sold' => $calc['total_sold'],
                'commission_percent' => $commissionPercent,
                'commission_amount' => $calc['commission_amount'],
                'payable_amount' => $calc['payable_amount'],
                'status' => 'draft',
                'created_by' => auth()->id(),
            ]);

            foreach ($calc['items'] as $item) {
                ConsignmentSettlementItem::create([
                    'consignment_settlement_id' => $settlement->id,
                    ...$item,
                ]);
            }

            return $settlement->fresh('items');
        });
    }

    public function approve(ConsignmentSettlement $settlement, User $approver): ConsignmentSettlement
    {
        $settlement->update(['status' => 'approved', 'approved_by' => $approver->id]);

        return $settlement;
    }

    /**
     * Bug nyata (Fase 13 §Temuan L): sebelumnya cuma ubah status,
     * pembayaran ke pemilik barang tidak pernah menyentuh kas sama
     * sekali meski `consignment_settlements.cash_account_id` sudah
     * disiapkan sejak tabel ini dibuat.
     */
    public function markPaid(ConsignmentSettlement $settlement, ?CashAccount $cashAccount = null): ConsignmentSettlement
    {
        return DB::transaction(function () use ($settlement, $cashAccount) {
            $locked = ConsignmentSettlement::lockForUpdate()->findOrFail($settlement->id);
            $account = $cashAccount
                ?? CashAccount::where('outlet_id', $locked->outlet_id)->where('is_default', true)->first()
                ?? CashAccount::where('outlet_id', $locked->outlet_id)->first();

            if ($account !== null && $locked->payable_amount > 0) {
                $this->cashService->recordOut($account, $locked->payable_amount, null, "Settlement konsinyasi {$locked->reference}", null, $locked);
            }

            $locked->update([
                'status' => 'paid',
                'paid_at' => now(),
                'cash_account_id' => $account?->id,
            ]);

            return $locked;
        });
    }

    public function returnGoods(StockLayer $layer, float $qty): void
    {
        $outlet = $layer->outlet;
        $product = $layer->product;
        $qtyBefore = $this->stockService->getAvailable($product, $outlet);

        $this->stockService->reduceLayer($layer, $qty);

        $this->stockService->recordMovement(
            $product,
            $outlet,
            'consignment_return',
            -$qty,
            $qtyBefore,
            $layer->unit_cost,
            null,
            null,
            $layer->id,
        );
    }
}
