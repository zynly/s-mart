<?php

namespace App\Reports;

use App\Models\Sale;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SalesSummaryReport extends BaseReport
{
    public function key(): string
    {
        return 'sales-summary';
    }

    public function title(): string
    {
        return 'Laporan Penjualan';
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
            ->where('status', 'completed')
            ->when($filters['date_from'] ?? null, fn ($q, $v) => $q->where('sale_date', '>=', $v))
            ->when($filters['date_to'] ?? null, fn ($q, $v) => $q->where('sale_date', '<', Carbon::parse($v)->addDay()->toDateString()))
            ->when($filters['outlet_id'] ?? null, fn ($q, $v) => $q->where('outlet_id', $v))
            ->selectRaw('DATE(sale_date) as tanggal, COUNT(*) as transaksi, SUM(grand_total) as omzet, SUM(total_discount) as diskon, SUM(total_cost) as hpp, SUM(gross_profit) as laba_kotor')
            ->groupBy('tanggal')
            ->orderByDesc('tanggal');
    }

    public function columns(User $user): array
    {
        return [
            ['key' => 'tanggal', 'label' => 'Tanggal', 'type' => 'date'],
            ['key' => 'transaksi', 'label' => 'Transaksi', 'type' => 'number'],
            ['key' => 'omzet', 'label' => 'Omzet', 'type' => 'money'],
            ['key' => 'diskon', 'label' => 'Diskon', 'type' => 'money'],
            ['key' => 'hpp', 'label' => 'HPP', 'type' => 'money', 'hideWithoutCost' => true],
            ['key' => 'laba_kotor', 'label' => 'Laba Kotor', 'type' => 'money', 'hideWithoutCost' => true],
        ];
    }

    public function summary(Builder $query, User $user): array
    {
        // query() sudah agregat per-tanggal (groupBy) — jumlahkan lewat SQL
        // (subquery) alih-alih tarik semua baris ke PHP lalu reduce(), supaya
        // rentang tanggal panjang tidak menarik ribuan baris cuma untuk total.
        $totals = DB::query()->fromSub($query, 'agg')->selectRaw(
            'COALESCE(SUM(transaksi),0) as transaksi, COALESCE(SUM(omzet),0) as omzet, COALESCE(SUM(diskon),0) as diskon, COALESCE(SUM(hpp),0) as hpp, COALESCE(SUM(laba_kotor),0) as laba_kotor'
        )->first();

        return [
            'transaksi' => (int) $totals->transaksi,
            'omzet' => (int) $totals->omzet,
            'diskon' => (int) $totals->diskon,
            'hpp' => (int) $totals->hpp,
            'laba_kotor' => (int) $totals->laba_kotor,
        ];
    }

    public function scopeForCashier(Builder $query, User $user): Builder
    {
        return $query->where('user_id', $user->id);
    }
}
