<?php

namespace App\Services;

use App\Models\Outlet;
use App\Models\Product;
use App\Models\Stock;
use App\Models\StockOpname;
use App\Models\StockOpnameItem;
use App\Models\User;
use App\Support\ReferenceGenerator;
use DomainException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * T-074. Stock opname dengan blind count (ATURAN BISNIS: system_qty
 * dibekukan saat counting dimulai, tidak pernah diperlihatkan ke
 * petugas hitung).
 *
 * Status disederhanakan dari 6 nilai spec (draft|counting|review|
 * approved|posted|cancelled) jadi 5 — draft dilebur ke counting:
 * "draft" di spec cuma tahap pilih scope di form sebelum [Mulai
 * Hitung], tidak ada apa pun yang terkunci di situ, jadi start()
 * langsung menghasilkan header berstatus counting (1 aksi user,
 * bukan 2 klik tanpa nilai tambah).
 */
class OpnameService
{
    public function __construct(private readonly StockService $stockService) {}

    /**
     * @param  array{outlet_id:int, scope:string, scope_ids?:array<int,int>, opname_date?:string, note?:string}  $data
     */
    public function start(array $data, User $starter): StockOpname
    {
        return DB::transaction(function () use ($data, $starter) {
            $outlet = Outlet::findOrFail($data['outlet_id']);

            $existing = StockOpname::where('outlet_id', $outlet->id)
                ->whereIn('status', ['counting', 'review', 'approved'])
                ->exists();

            if ($existing) {
                throw new DomainException('Sudah ada opname yang sedang berjalan di outlet ini — selesaikan atau batalkan dulu sebelum memulai yang baru.');
            }

            $products = $this->resolveScopeProducts($data['scope'], $data['scope_ids'] ?? []);

            if ($products->isEmpty()) {
                throw new DomainException('Tidak ada produk yang cocok dengan cakupan opname ini.');
            }

            $systemQtyByProduct = Stock::where('outlet_id', $outlet->id)
                ->whereIn('product_id', $products->pluck('id'))
                ->pluck('qty', 'product_id');

            $opname = StockOpname::create([
                'reference' => ReferenceGenerator::generate('SO', $outlet->id),
                'outlet_id' => $outlet->id,
                'scope' => $data['scope'],
                'scope_ids' => $data['scope'] === 'all' ? null : ($data['scope_ids'] ?? []),
                'opname_date' => $data['opname_date'] ?? now()->toDateString(),
                'cutoff_at' => now(),
                'status' => 'counting',
                'total_items' => $products->count(),
                'counted_items' => 0,
                'is_blind' => true,
                'started_by' => $starter->id,
                'note' => $data['note'] ?? null,
            ]);

            foreach ($products as $product) {
                StockOpnameItem::create([
                    'stock_opname_id' => $opname->id,
                    'product_id' => $product->id,
                    'system_qty' => (float) ($systemQtyByProduct[$product->id] ?? 0),
                ]);
            }

            return $opname;
        });
    }

    /**
     * @return Collection<int, Product>
     */
    private function resolveScopeProducts(string $scope, array $scopeIds): Collection
    {
        return match ($scope) {
            'all' => Product::where('is_active', true)->get(),
            'category' => Product::where('is_active', true)->whereIn('category_id', $scopeIds)->get(),
            'brand' => Product::where('is_active', true)->whereIn('brand_id', $scopeIds)->get(),
            'product' => Product::where('is_active', true)->whereIn('id', $scopeIds)->get(),
            default => throw new DomainException("Cakupan opname \"{$scope}\" tidak dikenali."),
        };
    }

    public function recordCount(StockOpname $opname, Product $product, float $physicalQty, User $counter): StockOpnameItem
    {
        return DB::transaction(function () use ($opname, $product, $physicalQty, $counter) {
            $locked = StockOpname::lockForUpdate()->findOrFail($opname->id);

            if ($locked->status !== 'counting') {
                throw new DomainException('Opname harus berstatus sedang menghitung untuk mencatat qty fisik.');
            }

            $item = StockOpnameItem::where('stock_opname_id', $locked->id)
                ->where('product_id', $product->id)
                ->first();

            if ($item === null) {
                throw new DomainException('Produk ini tidak termasuk dalam cakupan opname ini.');
            }

            $isFirstCount = $item->physical_qty === null;

            $item->update([
                'physical_qty' => $physicalQty,
                'counted_by' => $counter->id,
                'counted_at' => now(),
            ]);

            if ($isFirstCount) {
                $locked->increment('counted_items');
            }

            return $item->fresh();
        });
    }

    public function finishCounting(StockOpname $opname, User $reviewer): StockOpname
    {
        return DB::transaction(function () use ($opname, $reviewer) {
            $locked = StockOpname::lockForUpdate()->findOrFail($opname->id);

            if ($locked->status !== 'counting') {
                throw new DomainException('Opname harus berstatus sedang menghitung untuk diselesaikan.');
            }

            $items = StockOpnameItem::where('stock_opname_id', $locked->id)->get();

            if ($items->contains(fn (StockOpnameItem $i) => $i->physical_qty === null)) {
                throw new DomainException('Masih ada item yang belum dihitung — semua item wajib diisi qty fisiknya.');
            }

            $totalVarianceValue = 0;
            $totalVarianceQty = 0.0;
            $totalSystemValue = 0;

            foreach ($items as $item) {
                $unitCost = (int) (Stock::where('product_id', $item->product_id)->where('outlet_id', $locked->outlet_id)->value('avg_cost') ?? 0);

                // Audit Fase 6 (Temuan Sedang): sebelumnya dihitung
                // `physical_qty - system_qty` MENTAH — beda formula dari
                // post() (yang benar: `physical - (system + pergerakan
                // SEJAK cutoff)`, supaya penjualan sah selama counting
                // tidak ikut ditimpa/dobel-hitung). Owner sebelumnya
                // menyetujui angka yang BUKAN angka yang akan benar-benar
                // diposting. Disamakan di sini — dihitung ULANG di post()
                // nanti (bukan disalin dari sini), karena pergerakan bisa
                // terus bertambah antara approve() dan post() kalau
                // jaraknya berhari-hari; itu celah terpisah yang lebih
                // besar (di luar cakupan perbaikan formula ini).
                $movementSinceCutoff = (float) DB::table('stock_movements')
                    ->where('product_id', $item->product_id)
                    ->where('outlet_id', $locked->outlet_id)
                    ->where('created_at', '>', $locked->cutoff_at)
                    ->sum('qty');

                $varianceQty = (float) $item->physical_qty - ((float) $item->system_qty + $movementSinceCutoff);
                $varianceValue = (int) round($varianceQty * $unitCost);

                $item->update([
                    'unit_cost' => $unitCost,
                    'variance_qty' => $varianceQty,
                    'variance_value' => $varianceValue,
                ]);

                $totalVarianceQty += $varianceQty;
                $totalVarianceValue += $varianceValue;
                $totalSystemValue += (int) round((float) $item->system_qty * $unitCost);
            }

            $variancePercent = $totalSystemValue > 0
                ? abs($totalVarianceValue) / $totalSystemValue * 100
                : ($totalVarianceValue !== 0 ? 100.0 : 0.0);

            $locked->update([
                'status' => 'review',
                'total_variance_qty' => $totalVarianceQty,
                'total_variance_value' => $totalVarianceValue,
                'variance_percent' => $variancePercent,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
            ]);

            return $locked->fresh();
        });
    }

    public function approve(StockOpname $opname, User $approver): StockOpname
    {
        return DB::transaction(function () use ($opname, $approver) {
            $locked = StockOpname::lockForUpdate()->findOrFail($opname->id);

            if ($locked->status !== 'review') {
                throw new DomainException('Opname harus berstatus review untuk disetujui.');
            }

            if (! $approver->can('opname.approve')) {
                throw new DomainException('Anda tidak berwenang menyetujui opname.');
            }

            $tolerance = (float) config('pos.opname_tolerance_percent', 0.5);

            if ((float) $locked->variance_percent > $tolerance && ! $approver->can('opname.approve_variance')) {
                throw new DomainException(
                    "Selisih opname ({$locked->variance_percent}%) melebihi toleransi ({$tolerance}%) — wajib disetujui owner."
                );
            }

            $itemsNeedingReason = StockOpnameItem::where('stock_opname_id', $locked->id)
                ->get()
                ->filter(function (StockOpnameItem $item) use ($tolerance) {
                    if ((float) $item->variance_qty === 0.0) {
                        return false;
                    }

                    if ((float) $item->system_qty <= 0) {
                        return $item->variance_reason === null;
                    }

                    $itemVariancePercent = abs((float) $item->variance_qty) / (float) $item->system_qty * 100;

                    return $itemVariancePercent > $tolerance && $item->variance_reason === null;
                });

            if ($itemsNeedingReason->isNotEmpty()) {
                throw new DomainException('Semua item dengan selisih di luar toleransi wajib diisi alasan sebelum disetujui.');
            }

            $locked->update([
                'status' => 'approved',
                'approved_by' => $approver->id,
                'approved_at' => now(),
            ]);

            return $locked->fresh();
        });
    }

    /**
     * BARU DI SINI stok sungguh berubah. Tidak bisa diedit lagi setelah
     * posted — koreksi berikutnya hanya lewat opname baru.
     */
    public function post(StockOpname $opname, User $poster): StockOpname
    {
        return DB::transaction(function () use ($opname, $poster) {
            $locked = StockOpname::lockForUpdate()->findOrFail($opname->id);

            if ($locked->status !== 'approved') {
                throw new DomainException('Opname harus berstatus disetujui untuk diposting.');
            }

            $outlet = Outlet::findOrFail($locked->outlet_id);
            $items = StockOpnameItem::where('stock_opname_id', $locked->id)
                ->where('variance_qty', '!=', 0)
                ->with('product')
                ->get();

            foreach ($items as $item) {
                // Transaksi yang terjadi SELAMA counting (mis. penjualan)
                // sudah sah dan sudah tercatat di stock_movements —
                // jangan dihitung dobel di sini. Bukan physical - system,
                // tapi physical - (system + net pergerakan sejak cutoff).
                $movementSinceCutoff = (float) DB::table('stock_movements')
                    ->where('product_id', $item->product_id)
                    ->where('outlet_id', $outlet->id)
                    ->where('created_at', '>', $locked->cutoff_at)
                    ->sum('qty');

                $postingQty = (float) $item->physical_qty - ((float) $item->system_qty + $movementSinceCutoff);

                if (abs($postingQty) < 0.0005) {
                    continue;
                }

                $qtyBefore = $this->stockService->getAvailable($item->product, $outlet);

                if ($postingQty < 0) {
                    $this->stockService->consume($item->product, $outlet, abs($postingQty), $locked);
                } else {
                    $this->stockService->addLayer($item->product, $outlet, $postingQty, (int) $item->unit_cost, source: $locked);
                }

                $this->stockService->recordMovement(
                    $item->product,
                    $outlet,
                    'opname',
                    $postingQty,
                    $qtyBefore,
                    (int) $item->unit_cost,
                    $locked,
                    "Opname {$locked->reference}",
                );
            }

            $locked->update([
                'status' => 'posted',
                'posted_by' => $poster->id,
                'posted_at' => now(),
            ]);

            return $locked->fresh();
        });
    }

    public function cancel(StockOpname $opname, User $canceller): StockOpname
    {
        return DB::transaction(function () use ($opname, $canceller) {
            $locked = StockOpname::lockForUpdate()->findOrFail($opname->id);

            if (! in_array($locked->status, ['counting', 'review'], true)) {
                throw new DomainException('Opname yang sudah disetujui/diposting tidak bisa dibatalkan.');
            }

            $locked->update([
                'status' => 'cancelled',
                'note' => trim(($locked->note ? $locked->note.' ' : '').'Dibatalkan oleh '.$canceller->name.'.'),
            ]);

            return $locked->fresh();
        });
    }
}
