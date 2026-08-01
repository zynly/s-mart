<?php

namespace App\Reports;

use App\Models\Stock;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class StockSummaryReport extends BaseReport
{
    public function key(): string
    {
        return 'stock-summary';
    }

    public function title(): string
    {
        return 'Laporan Stok';
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
        ];
    }

    public function query(array $filters, User $user): Builder
    {
        return Stock::query()
            ->join('products', 'products.id', '=', 'stocks.product_id')
            ->join('outlets', 'outlets.id', '=', 'stocks.outlet_id')
            ->where('stocks.qty', '>', 0)
            ->when($filters['outlet_id'] ?? null, fn ($q, $v) => $q->where('stocks.outlet_id', $v))
            ->selectRaw('stocks.id, products.sku as sku, products.name as produk, outlets.name as outlet, stocks.qty as qty, stocks.avg_cost as avg_cost, (stocks.qty * stocks.avg_cost) as nilai')
            ->orderBy('products.name');
    }

    public function columns(User $user): array
    {
        return [
            ['key' => 'sku', 'label' => 'SKU', 'type' => 'text'],
            ['key' => 'produk', 'label' => 'Produk', 'type' => 'text'],
            ['key' => 'outlet', 'label' => 'Outlet', 'type' => 'text'],
            ['key' => 'qty', 'label' => 'Qty', 'type' => 'number'],
            ['key' => 'avg_cost', 'label' => 'Avg Cost', 'type' => 'money', 'hideWithoutCost' => true],
            ['key' => 'nilai', 'label' => 'Nilai Persediaan', 'type' => 'money', 'hideWithoutCost' => true],
        ];
    }

    public function summary(Builder $query, User $user): array
    {
        $rows = $query->get();

        return [
            'qty' => (float) $rows->sum('qty'),
            'nilai' => (int) $rows->sum('nilai'),
        ];
    }
}
