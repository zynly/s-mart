<?php

namespace App\Services;

use App\Models\CashAccount;
use App\Models\ConsignmentSettlement;
use App\Models\ConsignmentSettlementItem;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\SaleItem;
use App\Models\StockLayer;
use App\Models\StockLayerConsumption;
use App\Models\Supplier;
use App\Models\User;
use App\Support\ReferenceGenerator;
use DomainException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ConsignmentService
{
    public function __construct(
        private readonly StockService $stockService,
        private readonly CashService $cashService,
    ) {}

    /**
     * Hitung barang konsinyasi terjual (via stock_layer_consumptions pada
     * layer is_consignment) dalam periode.
     *
     * Audit Fase 6 (Temuan Sedang): sebelumnya pakai harga jual AKTIF
     * SEKARANG (priceService->getActivePrice()) — kalau harga produk
     * berubah antara transaksi terjadi dan settlement dibuat, supplier
     * dibayar berdasarkan harga yang SALAH (bukan harga yang benar-benar
     * berlaku saat barang terjual). Sekarang join langsung ke `sale_items`
     * (via relasi polimorfik consumableable pada stock_layer_consumptions)
     * untuk memakai `unit_price` yang benar-benar tercatat di nota asli.
     *
     * INNER JOIN ke sale_items juga SENGAJA mengecualikan konsumsi layer
     * konsinyasi yang bukan dari penjualan (mis. StockTransferItem saat
     * dipindah ke outlet lain, atau koreksi StockOpname) — perilaku LAMA
     * ikut menghitungnya sebagai "terjual" (bug tambahan yang ikut
     * tertutup di sini): barang yang dipindah/dikoreksi bukan barang yang
     * terjual ke pelanggan, tidak seharusnya menghasilkan kewajiban
     * komisi ke pemilik barang.
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
            ->join('sale_items', function ($join) {
                $join->on('sale_items.id', '=', 'stock_layer_consumptions.consumableable_id')
                    ->where('stock_layer_consumptions.consumableable_type', SaleItem::class);
            })
            ->whereIn('stock_layer_consumptions.stock_layer_id', $layerIds)
            ->whereBetween('stock_layer_consumptions.created_at', [$periodStart, $periodEnd])
            ->select('stock_layer_consumptions.qty', 'stock_layers.product_id', 'sale_items.unit_price')
            ->get()
            ->groupBy('product_id');

        $items = [];
        $totalSold = 0;
        $totalCommission = 0;

        foreach ($consumptionsByProduct as $productId => $group) {
            $product = Product::findOrFail($productId);
            $qtySold = (float) $group->sum('qty');
            // Rata-rata tertimbang harga JUAL SEBENARNYA per baris —
            // bisa berbeda antar transaksi dalam periode yang sama kalau
            // harga produk sempat berubah, bukan satu harga "sekarang".
            $totalPrice = (int) round($group->sum(fn ($row) => (float) $row->qty * $row->unit_price));
            $commission = (int) round($totalPrice * $commissionPercent / 100);

            $items[] = [
                'product_id' => (int) $productId,
                'qty_sold' => $qtySold,
                // Rata-rata (bisa beda dari harga produk saat ini kalau
                // sudah berubah sejak transaksi) — bukan lagi single
                // "harga aktif sekarang".
                'unit_price' => $qtySold > 0 ? (int) round($totalPrice / $qtySold) : 0,
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
            // Audit Fase 6 (Temuan Sedang): sebelumnya tidak ada proteksi
            // periode overlap/duplikat sama sekali — settle() dua kali
            // untuk rentang yang sama/tumpang tindih menghitung ULANG
            // konsumsi yang SAMA dari stock_layer_consumptions, supplier
            // bisa dibayar dobel via markPaid() untuk barang yang sama.
            $overlapping = ConsignmentSettlement::where('supplier_id', $supplier->id)
                ->where('outlet_id', $outlet->id)
                ->whereIn('status', ['draft', 'approved', 'paid'])
                ->where('period_start', '<=', $periodEnd)
                ->where('period_end', '>=', $periodStart)
                ->exists();

            if ($overlapping) {
                throw new DomainException('Sudah ada settlement lain (draft/approved/paid) yang periodenya tumpang tindih untuk supplier & outlet ini.');
            }

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

            // Audit Fase 4 (Temuan Tinggi): sebelumnya TIDAK ADA guard
            // status di sini — klik ganda/retry submit memanggil
            // recordOut() dua kali (kas keluar 2x sungguhan), padahal
            // ConsignmentSettlementObserver hanya menjurnal SEKALI (di-
            // guard wasChanged('status'), panggilan kedua status sudah
            // sama). Selisih riil antara subsidiary cash ledger dan GL.
            if ($locked->status !== 'approved') {
                throw new DomainException("Settlement berstatus \"{$locked->status}\" tidak bisa ditandai lunas — wajib berstatus approved terlebih dulu.");
            }

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
