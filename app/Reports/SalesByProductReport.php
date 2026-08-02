<?php

namespace App\Reports;

use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Qty/omzet/HPP/margin per produk (spec item 2, PROMPT-POS §Fase 14).
 * Kontribusi % dihitung di frontend dari omzet baris / total omzet
 * summary() — tidak perlu window function tambahan di query.
 */
class SalesByProductReport extends BaseReport
{
    public function key(): string
    {
        return 'sales-by-product';
    }

    public function title(): string
    {
        return 'Penjualan per Produk';
    }

    public function category(): string
    {
        return 'penjualan';
    }

    public function requiredPermission(): string
    {
        return 'report.view';
    }

    public function filters(): array
    {
        return [
            ['key' => 'date_from', 'label' => 'Dari', 'type' => 'date'],
            ['key' => 'date_to', 'label' => 'Sampai', 'type' => 'date'],
            ['key' => 'outlet_id', 'label' => 'Outlet', 'type' => 'outlet'],
        ];
    }

    public function query(array $filters, User $user): Builder
    {
        return SaleItem::query()
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->where('sales.status', 'completed')
            ->when($filters['date_from'] ?? null, fn ($q, $v) => $q->where('sales.sale_date', '>=', $v))
            ->when($filters['date_to'] ?? null, fn ($q, $v) => $q->where('sales.sale_date', '<', Carbon::parse($v)->addDay()->toDateString()))
            ->when($filters['outlet_id'] ?? null, fn ($q, $v) => $q->where('sales.outlet_id', $v))
            ->selectRaw('products.id as product_id, products.name as produk, products.sku as sku, SUM(sale_items.qty_base) as qty, SUM(sale_items.subtotal) as omzet, SUM(sale_items.total_cost) as hpp, SUM(sale_items.subtotal - sale_items.total_cost) as margin')
            ->groupBy('products.id', 'products.name', 'products.sku')
            ->orderByDesc('omzet');
    }

    public function columns(User $user): array
    {
        return [
            ['key' => 'sku', 'label' => 'SKU', 'type' => 'text'],
            ['key' => 'produk', 'label' => 'Produk', 'type' => 'text'],
            ['key' => 'qty', 'label' => 'Qty', 'type' => 'number'],
            ['key' => 'omzet', 'label' => 'Omzet', 'type' => 'money'],
            ['key' => 'hpp', 'label' => 'HPP', 'type' => 'money', 'hideWithoutCost' => true],
            ['key' => 'margin', 'label' => 'Margin', 'type' => 'money', 'hideWithoutCost' => true],
        ];
    }

    public function summary(Builder $query, User $user): array
    {
        $totals = DB::query()->fromSub($query, 'agg')->selectRaw(
            'COALESCE(SUM(qty),0) as qty, COALESCE(SUM(omzet),0) as omzet, COALESCE(SUM(hpp),0) as hpp, COALESCE(SUM(margin),0) as margin'
        )->first();

        return [
            'qty' => (float) $totals->qty,
            'omzet' => (int) $totals->omzet,
            'hpp' => (int) $totals->hpp,
            'margin' => (int) $totals->margin,
        ];
    }

    public function scopeForCashier(Builder $query, User $user): Builder
    {
        return $query->where('sales.user_id', $user->id);
    }
}
