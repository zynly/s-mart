<?php

namespace App\Reports;

use App\Models\CashierSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class CashierSessionReport extends BaseReport
{
    public function key(): string
    {
        return 'cashier-sessions';
    }

    public function title(): string
    {
        return 'Laporan Sesi Kasir';
    }

    public function category(): string
    {
        return 'kasir';
    }

    public function requiredPermission(): string
    {
        return 'report.view';
    }

    public function filters(): array
    {
        return [
            ['key' => 'date_from', 'label' => 'Dari Sesi', 'type' => 'date'],
            ['key' => 'date_to', 'label' => 'Sampai Sesi', 'type' => 'date'],
            ['key' => 'outlet_id', 'label' => 'Outlet', 'type' => 'outlet'],
            ['key' => 'cashier_id', 'label' => 'Kasir', 'type' => 'user'],
        ];
    }

    public function query(array $filters, User $user): Builder
    {
        return CashierSession::query()
            ->join('users', 'users.id', '=', 'cashier_sessions.user_id')
            ->join('outlets', 'outlets.id', '=', 'cashier_sessions.outlet_id')
            ->when($filters['date_from'] ?? null, fn ($q, $v) => $q->whereDate('cashier_sessions.opened_at', '>=', $v))
            ->when($filters['date_to'] ?? null, fn ($q, $v) => $q->whereDate('cashier_sessions.opened_at', '<=', $v))
            ->when($filters['outlet_id'] ?? null, fn ($q, $v) => $q->where('cashier_sessions.outlet_id', $v))
            ->when($filters['cashier_id'] ?? null, fn ($q, $v) => $q->where('cashier_sessions.user_id', $v))
            ->selectRaw('
                cashier_sessions.id as id,
                users.name as kasir,
                outlets.name as outlet,
                cashier_sessions.opened_at as waktu_buka,
                cashier_sessions.closed_at as waktu_tutup,
                cashier_sessions.opening_cash as kas_awal,
                cashier_sessions.total_cash_sales as penjualan_tunai,
                cashier_sessions.total_non_cash_sales as penjualan_non_tunai,
                cashier_sessions.total_sales as total_omzet,
                cashier_sessions.expected_cash as estimasi_kas,
                cashier_sessions.closing_cash as kas_akhir_laci,
                cashier_sessions.cash_difference as selisih,
                cashier_sessions.status as status
            ')
            ->orderByDesc('cashier_sessions.opened_at');
    }

    public function columns(User $user): array
    {
        return [
            ['key' => 'waktu_buka', 'label' => 'Waktu Buka', 'type' => 'datetime'],
            ['key' => 'waktu_tutup', 'label' => 'Waktu Tutup', 'type' => 'datetime'],
            ['key' => 'kasir', 'label' => 'Kasir', 'type' => 'text'],
            ['key' => 'outlet', 'label' => 'Outlet', 'type' => 'text'],
            ['key' => 'kas_awal', 'label' => 'Kas Awal', 'type' => 'money'],
            ['key' => 'penjualan_tunai', 'label' => 'Penjualan Tunai', 'type' => 'money'],
            ['key' => 'penjualan_non_tunai', 'label' => 'Penjualan Non-Tunai', 'type' => 'money'],
            ['key' => 'total_omzet', 'label' => 'Total Omzet', 'type' => 'money'],
            ['key' => 'kas_akhir_laci', 'label' => 'Kas Akhir Laci', 'type' => 'money'],
            ['key' => 'selisih', 'label' => 'Selisih', 'type' => 'money'],
            ['key' => 'status', 'label' => 'Status Sesi', 'type' => 'badge'],
        ];
    }

    public function summary(Builder $query, User $user): array
    {
        $totals = DB::query()->fromSub($query, 'agg')->selectRaw(
            'COALESCE(COUNT(*),0) as total_sesi,
             COALESCE(SUM(kas_awal),0) as total_kas_awal,
             COALESCE(SUM(penjualan_tunai),0) as total_tunai,
             COALESCE(SUM(penjualan_non_tunai),0) as total_non_tunai,
             COALESCE(SUM(total_omzet),0) as grand_total_omzet,
             COALESCE(SUM(selisih),0) as total_selisih'
        )->first();

        return [
            'total_sesi' => (int) $totals->total_sesi,
            'total_kas_awal' => (int) $totals->total_kas_awal,
            'penjualan_tunai' => (int) $totals->total_tunai,
            'penjualan_non_tunai' => (int) $totals->total_non_tunai,
            'total_omzet' => (int) $totals->grand_total_omzet,
            'selisih' => (int) $totals->total_selisih,
        ];
    }

    public function scopeForCashier(Builder $query, User $user): Builder
    {
        return $query->where('cashier_sessions.user_id', $user->id);
    }
}
