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
        return 'penjualan';
    }

    public function requiredPermission(): string
    {
        return 'report.view';
    }

    public function filters(): array
    {
        return [
            ['key' => 'date_from', 'label' => 'Dari Tanggal', 'type' => 'date'],
            ['key' => 'date_to', 'label' => 'Sampai Tanggal', 'type' => 'date'],
            ['key' => 'session_id', 'label' => 'Pilih Sesi Spesifik', 'type' => 'session'],
            ['key' => 'outlet_id', 'label' => 'Outlet', 'type' => 'outlet'],
            ['key' => 'cashier_id', 'label' => 'Kasir', 'type' => 'user'],
        ];
    }

    public function query(array $filters, User $user): Builder
    {
        return CashierSession::query()
            ->join('users', 'users.id', '=', 'cashier_sessions.user_id')
            ->join('outlets', 'outlets.id', '=', 'cashier_sessions.outlet_id')
            ->leftJoin('cash_accounts', 'cash_accounts.id', '=', 'cashier_sessions.cash_account_id')
            ->when($filters['date_from'] ?? null, fn ($q, $v) => $q->whereDate('cashier_sessions.opened_at', '>=', $v))
            ->when($filters['date_to'] ?? null, fn ($q, $v) => $q->whereDate('cashier_sessions.opened_at', '<=', $v))
            ->when($filters['session_id'] ?? null, fn ($q, $v) => $q->where('cashier_sessions.id', $v))
            ->when($filters['outlet_id'] ?? null, fn ($q, $v) => $q->where('cashier_sessions.outlet_id', $v))
            ->when($filters['cashier_id'] ?? null, fn ($q, $v) => $q->where('cashier_sessions.user_id', $v))
            ->selectRaw('
                cashier_sessions.id as id,
                cashier_sessions.reference as referensi,
                users.name as kasir,
                COALESCE(cash_accounts.name, "Laci Kasir") as laci,
                outlets.name as outlet,
                cashier_sessions.opened_at as waktu_buka,
                cashier_sessions.closed_at as waktu_tutup,
                cashier_sessions.opening_cash as kas_awal,
                cashier_sessions.total_sales_cash as penjualan_tunai,
                cashier_sessions.total_sales_noncash as penjualan_non_tunai,
                cashier_sessions.total_sales_deposit as penjualan_deposit,
                cashier_sessions.total_topup_cash as topup_tunai,
                cashier_sessions.total_receivable_cash as pelunasan_piutang,
                cashier_sessions.total_cash_in as kas_masuk,
                cashier_sessions.total_cash_out as kas_keluar,
                cashier_sessions.expected_cash as expected_cash,
                cashier_sessions.actual_cash as actual_cash,
                cashier_sessions.difference as selisih,
                cashier_sessions.status as status,
                cashier_sessions.difference_reason as catatan
            ')
            ->orderByDesc('cashier_sessions.opened_at');
    }

    public function columns(User $user): array
    {
        return [
            ['key' => 'referensi', 'label' => 'No. Referensi', 'type' => 'text'],
            ['key' => 'waktu_buka', 'label' => 'Waktu Buka', 'type' => 'datetime'],
            ['key' => 'waktu_tutup', 'label' => 'Waktu Tutup', 'type' => 'datetime'],
            ['key' => 'kasir', 'label' => 'Kasir', 'type' => 'text'],
            ['key' => 'laci', 'label' => 'Laci Kasir', 'type' => 'text'],
            ['key' => 'outlet', 'label' => 'Outlet', 'type' => 'text'],
            ['key' => 'kas_awal', 'label' => 'Modal Awal', 'type' => 'money'],
            ['key' => 'penjualan_tunai', 'label' => 'Penjualan Tunai', 'type' => 'money'],
            ['key' => 'penjualan_non_tunai', 'label' => 'Penjualan Non-Tunai', 'type' => 'money'],
            ['key' => 'penjualan_deposit', 'label' => 'Penjualan Deposit', 'type' => 'money'],
            ['key' => 'topup_tunai', 'label' => 'Topup Tunai', 'type' => 'money'],
            ['key' => 'pelunasan_piutang', 'label' => 'Pelunasan Piutang', 'type' => 'money'],
            ['key' => 'kas_masuk', 'label' => 'Kas Masuk', 'type' => 'money'],
            ['key' => 'kas_keluar', 'label' => 'Kas Keluar', 'type' => 'money'],
            ['key' => 'expected_cash', 'label' => 'Expected Cash', 'type' => 'money'],
            ['key' => 'actual_cash', 'label' => 'Actual Cash', 'type' => 'money'],
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
             COALESCE(SUM(penjualan_deposit),0) as total_deposit,
             COALESCE(SUM(topup_tunai),0) as total_topup,
             COALESCE(SUM(pelunasan_piutang),0) as total_piutang,
             COALESCE(SUM(kas_masuk),0) as total_kas_masuk,
             COALESCE(SUM(kas_keluar),0) as total_kas_keluar,
             COALESCE(SUM(expected_cash),0) as total_expected,
             COALESCE(SUM(actual_cash),0) as total_actual,
             COALESCE(SUM(selisih),0) as total_selisih'
        )->first();

        return [
            'total_sesi' => (int) $totals->total_sesi,
            'total_kas_awal' => (int) $totals->total_kas_awal,
            'penjualan_tunai' => (int) $totals->total_tunai,
            'penjualan_non_tunai' => (int) $totals->total_non_tunai,
            'penjualan_deposit' => (int) $totals->total_deposit,
            'topup_tunai' => (int) $totals->total_topup,
            'pelunasan_piutang' => (int) $totals->total_piutang,
            'kas_masuk' => (int) $totals->total_kas_masuk,
            'kas_keluar' => (int) $totals->total_kas_keluar,
            'total_expected' => (int) $totals->total_expected,
            'total_actual' => (int) $totals->total_actual,
            'selisih' => (int) $totals->total_selisih,
        ];
    }

    public function scopeForCashier(Builder $query, User $user): Builder
    {
        return $query->where('cashier_sessions.user_id', $user->id);
    }
}
