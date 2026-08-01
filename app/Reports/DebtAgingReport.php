<?php

namespace App\Reports;

use App\Models\Debt;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Wrapper tipis, sama alasan seperti ReceivableAgingReport — aturan
 * bucket sama persis dengan DebtService::getAging(), diekspresikan
 * ulang sebagai SQL supaya bisa dipaginasi.
 */
class DebtAgingReport extends BaseReport
{
    private const BUCKET_CASE = "CASE
        WHEN DATEDIFF(CURDATE(), debts.due_date) <= 0 THEN 'current'
        WHEN DATEDIFF(CURDATE(), debts.due_date) <= 30 THEN '0-30'
        WHEN DATEDIFF(CURDATE(), debts.due_date) <= 60 THEN '31-60'
        WHEN DATEDIFF(CURDATE(), debts.due_date) <= 90 THEN '61-90'
        ELSE '90+' END";

    public function key(): string
    {
        return 'debt-aging';
    }

    public function title(): string
    {
        return 'Laporan Hutang (Aging)';
    }

    public function category(): string
    {
        return 'piutang_hutang';
    }

    public function requiredPermission(): string
    {
        return 'debt.view';
    }

    public function filters(): array
    {
        return [
            ['key' => 'outlet_id', 'label' => 'Outlet', 'type' => 'outlet'],
        ];
    }

    public function query(array $filters, User $user): Builder
    {
        return Debt::query()
            ->join('suppliers', 'suppliers.id', '=', 'debts.supplier_id')
            ->whereIn('debts.status', ['unpaid', 'partial', 'overdue'])
            ->when($filters['outlet_id'] ?? null, fn ($q, $v) => $q->where('debts.outlet_id', $v))
            ->selectRaw('debts.id, debts.reference as referensi, suppliers.name as supplier, debts.total_amount as total, debts.paid_amount as dibayar, debts.remaining_amount as sisa, debts.due_date as jatuh_tempo, ('.self::BUCKET_CASE.') as bucket')
            ->orderBy('debts.due_date');
    }

    public function columns(User $user): array
    {
        return [
            ['key' => 'referensi', 'label' => 'Referensi', 'type' => 'text'],
            ['key' => 'supplier', 'label' => 'Supplier', 'type' => 'text'],
            ['key' => 'total', 'label' => 'Total', 'type' => 'money'],
            ['key' => 'dibayar', 'label' => 'Dibayar', 'type' => 'money'],
            ['key' => 'sisa', 'label' => 'Sisa', 'type' => 'money'],
            ['key' => 'jatuh_tempo', 'label' => 'Jatuh Tempo', 'type' => 'date'],
            ['key' => 'bucket', 'label' => 'Umur', 'type' => 'text'],
        ];
    }

    public function summary(Builder $query, User $user): array
    {
        $rows = $query->get();
        $byBucket = $rows->groupBy('bucket')->map(fn ($g) => (int) $g->sum('sisa'));

        return [
            'total_sisa' => (int) $rows->sum('sisa'),
            'per_bucket' => $byBucket,
        ];
    }
}
