<?php

namespace App\Reports;

use App\Models\Stock;
use App\Models\StockLayer;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Gabung "Stok Kritis" (qty di bawah products.min_stock) & "Kadaluwarsa"
 * (stock_layers.expired_at dalam N hari) jadi satu laporan 2 baris-tipe
 * (kolom `kategori`), sesuai penamaan T-086 — bukan digabung karena
 * granularitasnya sama (produk vs layer), tapi disatukan lewat UNION
 * SQL supaya tetap satu result-set yang bisa dipaginasi BaseReport
 * generik (getAging()-style Collection eager tidak dipakai di sini).
 *
 * "Kritis" (Phase D) sengaja baca `stocks` (cache teragregasi, satu
 * baris per produk+outlet, disinkronkan transaksional oleh
 * StockService::recalculateCache()) — BUKAN SUM(stock_layers.qty_remaining)
 * langsung — supaya sama persis dengan angka yang dilihat user di
 * halaman Stok & widget dashboard (T-088, konsolidasi 4 tempat yang
 * dulu baca 2 sumber data berbeda). "Kadaluwarsa" TETAP baca
 * `stock_layers` — granularitas per-batch (`expired_at` per layer),
 * bukan sesuatu yang ada di tabel `stocks`.
 */
class StockCriticalExpiryReport extends BaseReport
{
    public function key(): string
    {
        return 'stock-critical-expiry';
    }

    public function title(): string
    {
        return 'Stok Kritis & Kadaluwarsa';
    }

    public function category(): string
    {
        return 'stok';
    }

    public function requiredPermission(): string
    {
        return 'stock.view';
    }

    public function filters(): array
    {
        return [
            ['key' => 'outlet_id', 'label' => 'Outlet', 'type' => 'outlet'],
            ['key' => 'expiry_days', 'label' => 'Ambang Kadaluwarsa (hari)', 'type' => 'number'],
        ];
    }

    public function query(array $filters, User $user): Builder
    {
        $expiryDays = (int) ($filters['expiry_days'] ?? 30);
        $threshold = Carbon::now()->addDays($expiryDays)->toDateString();

        $critical = Stock::query()
            ->join('products', 'products.id', '=', 'stocks.product_id')
            ->join('outlets', 'outlets.id', '=', 'stocks.outlet_id')
            ->selectRaw("'Kritis' as kategori, products.sku as sku, products.name as produk, outlets.name as outlet, stocks.qty as qty, products.min_stock as batas, NULL as tanggal")
            ->where('stocks.qty', '>', 0)
            ->whereColumn('stocks.qty', '<=', 'products.min_stock')
            ->when($filters['outlet_id'] ?? null, fn ($q, $v) => $q->where('stocks.outlet_id', $v));

        return StockLayer::query()
            ->join('products', 'products.id', '=', 'stock_layers.product_id')
            ->join('outlets', 'outlets.id', '=', 'stock_layers.outlet_id')
            ->selectRaw("'Kadaluwarsa' as kategori, products.sku as sku, products.name as produk, outlets.name as outlet, stock_layers.qty_remaining as qty, NULL as batas, stock_layers.expired_at as tanggal")
            ->where('stock_layers.qty_remaining', '>', 0)
            ->whereNotNull('stock_layers.expired_at')
            ->where('stock_layers.expired_at', '<=', $threshold)
            ->when($filters['outlet_id'] ?? null, fn ($q, $v) => $q->where('stock_layers.outlet_id', $v))
            ->unionAll($critical)
            ->orderBy('kategori');
    }

    public function columns(User $user): array
    {
        return [
            ['key' => 'kategori', 'label' => 'Kategori', 'type' => 'text'],
            ['key' => 'sku', 'label' => 'SKU', 'type' => 'text'],
            ['key' => 'produk', 'label' => 'Produk', 'type' => 'text'],
            ['key' => 'outlet', 'label' => 'Outlet', 'type' => 'text'],
            ['key' => 'qty', 'label' => 'Qty Tersisa', 'type' => 'number'],
            ['key' => 'batas', 'label' => 'Batas Minimum', 'type' => 'number'],
            ['key' => 'tanggal', 'label' => 'Kadaluwarsa', 'type' => 'date'],
        ];
    }
}
