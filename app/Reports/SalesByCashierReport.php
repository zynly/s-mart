<?php

namespace App\Reports;

use App\Models\Sale;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SalesByCashierReport extends BaseReport
{
    public function key(): string
    {
        return 'sales-by-cashier';
    }

    public function title(): string
    {
        return 'Penjualan per Kasir';
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
        return Sale::query()
            ->join('users', 'users.id', '=', 'sales.user_id')
            ->where('sales.status', 'completed')
            ->when($filters['date_from'] ?? null, fn ($q, $v) => $q->where('sales.sale_date', '>=', $v))
            ->when($filters['date_to'] ?? null, fn ($q, $v) => $q->where('sales.sale_date', '<', Carbon::parse($v)->addDay()->toDateString()))
            ->when($filters['outlet_id'] ?? null, fn ($q, $v) => $q->where('sales.outlet_id', $v))
            ->selectRaw('users.id as user_id, users.name as kasir, COUNT(*) as transaksi, SUM(sales.grand_total) as omzet, AVG(sales.grand_total) as rata_rata_nota')
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('omzet');
    }

    public function columns(User $user): array
    {
        return [
            ['key' => 'kasir', 'label' => 'Kasir', 'type' => 'text'],
            ['key' => 'transaksi', 'label' => 'Transaksi', 'type' => 'number'],
            ['key' => 'omzet', 'label' => 'Omzet', 'type' => 'money'],
            ['key' => 'rata_rata_nota', 'label' => 'Rata-rata Nota', 'type' => 'money'],
        ];
    }

    public function summary(Builder $query, User $user): array
    {
        $totals = DB::query()->fromSub($query, 'agg')->selectRaw(
            'COALESCE(SUM(transaksi),0) as transaksi, COALESCE(SUM(omzet),0) as omzet'
        )->first();

        $transaksi = (int) $totals->transaksi;
        $omzet = (int) $totals->omzet;

        return [
            'transaksi' => $transaksi,
            'omzet' => $omzet,
            'rata_rata_nota' => $transaksi > 0 ? (int) round($omzet / $transaksi) : 0,
        ];
    }

    public function scopeForCashier(Builder $query, User $user): Builder
    {
        return $query->where('sales.user_id', $user->id);
    }
}
