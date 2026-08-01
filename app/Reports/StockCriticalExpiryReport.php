<?php

namespace App\Reports;

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

        $critical = StockLayer::query()
            ->join('products', 'products.id', '=', 'stock_layers.product_id')
            ->join('outlets', 'outlets.id', '=', 'stock_layers.outlet_id')
            ->selectRaw("'Kritis' as kategori, products.sku as sku, products.name as produk, outlets.name as outlet, SUM(stock_layers.qty_remaining) as qty, MIN(products.min_stock) as batas, NULL as tanggal")
            ->where('stock_layers.qty_remaining', '>', 0)
            ->when($filters['outlet_id'] ?? null, fn ($q, $v) => $q->where('stock_layers.outlet_id', $v))
            ->groupBy('products.id', 'products.sku', 'products.name', 'outlets.id', 'outlets.name')
            ->havingRaw('SUM(stock_layers.qty_remaining) <= MIN(products.min_stock)');

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
