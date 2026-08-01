<?php

namespace App\Reports;

use App\Models\SalePayment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class SalesByPaymentMethodReport extends BaseReport
{
    public function key(): string
    {
        return 'sales-by-payment-method';
    }

    public function title(): string
    {
        return 'Penjualan per Metode Bayar';
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
        return SalePayment::query()
            ->join('sales', 'sales.id', '=', 'sale_payments.sale_id')
            ->join('payment_methods', 'payment_methods.id', '=', 'sale_payments.payment_method_id')
            ->where('sales.status', 'completed')
            ->where('sale_payments.status', 'settled')
            ->when($filters['date_from'] ?? null, fn ($q, $v) => $q->whereDate('sales.sale_date', '>=', $v))
            ->when($filters['date_to'] ?? null, fn ($q, $v) => $q->whereDate('sales.sale_date', '<=', $v))
            ->when($filters['outlet_id'] ?? null, fn ($q, $v) => $q->where('sales.outlet_id', $v))
            ->selectRaw('payment_methods.id as payment_method_id, payment_methods.name as metode, COUNT(*) as transaksi, SUM(sale_payments.amount) as total, SUM(sale_payments.mdr_amount) as mdr')
            ->groupBy('payment_methods.id', 'payment_methods.name')
            ->orderByDesc('total');
    }

    public function columns(User $user): array
    {
        return [
            ['key' => 'metode', 'label' => 'Metode Bayar', 'type' => 'text'],
            ['key' => 'transaksi', 'label' => 'Transaksi', 'type' => 'number'],
            ['key' => 'total', 'label' => 'Total', 'type' => 'money'],
            ['key' => 'mdr', 'label' => 'Beban MDR', 'type' => 'money'],
        ];
    }

    public function summary(Builder $query, User $user): array
    {
        $rows = $query->get();

        return [
            'transaksi' => (int) $rows->sum('transaksi'),
            'total' => (int) $rows->sum('total'),
            'mdr' => (int) $rows->sum('mdr'),
        ];
    }

    public function scopeForCashier(Builder $query, User $user): Builder
    {
        return $query->where('sales.user_id', $user->id);
    }
}
