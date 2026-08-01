<?php

namespace App\Reports;

use App\Models\Sale;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

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
            ->when($filters['date_from'] ?? null, fn ($q, $v) => $q->whereDate('sale_date', '>=', $v))
            ->when($filters['date_to'] ?? null, fn ($q, $v) => $q->whereDate('sale_date', '<=', $v))
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
        return $query->get()->reduce(function (array $carry, $r) {
            $carry['transaksi'] += (int) $r->transaksi;
            $carry['omzet'] += (int) $r->omzet;
            $carry['diskon'] += (int) $r->diskon;
            $carry['hpp'] += (int) $r->hpp;
            $carry['laba_kotor'] += (int) $r->laba_kotor;

            return $carry;
        }, ['transaksi' => 0, 'omzet' => 0, 'diskon' => 0, 'hpp' => 0, 'laba_kotor' => 0]);
    }

    public function scopeForCashier(Builder $query, User $user): Builder
    {
        return $query->where('user_id', $user->id);
    }
}
