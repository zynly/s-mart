<?php

namespace App\Reports;

use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Kartu stok per produk — filter `product_id` diperlakukan sebagai
 * filter bertipe 'product' seperti filter lain (Select di frontend),
 * bukan parameter route terpisah. Bila kosong, query dibuat sengaja
 * kosong (whereRaw('1=0')) — Show.tsx menampilkan pesan "pilih produk"
 * alih-alih error.
 */
class StockCardReport extends BaseReport
{
    public function key(): string
    {
        return 'stock-card';
    }

    public function title(): string
    {
        return 'Kartu Stok';
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
            ['key' => 'product_id', 'label' => 'Produk', 'type' => 'product'],
            ['key' => 'outlet_id', 'label' => 'Outlet', 'type' => 'outlet'],
            ['key' => 'date_from', 'label' => 'Dari', 'type' => 'date'],
            ['key' => 'date_to', 'label' => 'Sampai', 'type' => 'date'],
        ];
    }

    public function query(array $filters, User $user): Builder
    {
        $query = StockMovement::query()
            ->join('products', 'products.id', '=', 'stock_movements.product_id')
            ->join('outlets', 'outlets.id', '=', 'stock_movements.outlet_id')
            ->selectRaw('stock_movements.id, stock_movements.created_at as tanggal, stock_movements.reference as referensi, stock_movements.type as tipe, outlets.name as outlet, stock_movements.qty as qty, stock_movements.qty_before as qty_sebelum, stock_movements.qty_after as qty_sesudah, stock_movements.unit_cost as unit_cost, stock_movements.note as keterangan')
            ->orderByDesc('stock_movements.created_at');

        if (empty($filters['product_id'])) {
            return $query->whereRaw('1 = 0');
        }

        return $query
            ->where('stock_movements.product_id', $filters['product_id'])
            ->when($filters['outlet_id'] ?? null, fn ($q, $v) => $q->where('stock_movements.outlet_id', $v))
            ->when($filters['date_from'] ?? null, fn ($q, $v) => $q->whereDate('stock_movements.created_at', '>=', $v))
            ->when($filters['date_to'] ?? null, fn ($q, $v) => $q->whereDate('stock_movements.created_at', '<=', $v));
    }

    public function columns(User $user): array
    {
        return [
            ['key' => 'tanggal', 'label' => 'Tanggal', 'type' => 'datetime'],
            ['key' => 'referensi', 'label' => 'Referensi', 'type' => 'text'],
            ['key' => 'tipe', 'label' => 'Tipe', 'type' => 'text'],
            ['key' => 'outlet', 'label' => 'Outlet', 'type' => 'text'],
            ['key' => 'qty', 'label' => 'Qty', 'type' => 'signed_number'],
            ['key' => 'qty_sesudah', 'label' => 'Saldo', 'type' => 'number'],
            ['key' => 'unit_cost', 'label' => 'Unit Cost', 'type' => 'money', 'hideWithoutCost' => true],
            ['key' => 'keterangan', 'label' => 'Keterangan', 'type' => 'text'],
        ];
    }
}
