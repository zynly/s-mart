<?php

namespace App\Reports;

use App\Models\Debt;
use App\Models\User;
use App\Support\AgingBucket;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Wrapper tipis, sama alasan seperti ReceivableAgingReport — aturan
 * bucket sama persis dengan DebtService::getAging(), diekspresikan
 * ulang sebagai SQL (lewat AgingBucket::sqlCase()) supaya bisa
 * dipaginasi.
 */
class DebtAgingReport extends BaseReport
{
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
            ->selectRaw('debts.id, debts.reference as referensi, suppliers.name as supplier, debts.total_amount as total, debts.paid_amount as dibayar, debts.remaining_amount as sisa, debts.due_date as jatuh_tempo, ('.AgingBucket::sqlCase('debts.due_date').') as bucket')
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
        $perBucket = DB::query()->fromSub($query, 'agg')
            ->selectRaw('bucket, SUM(sisa) as total')
            ->groupBy('bucket')
            ->pluck('total', 'bucket')
            ->map(fn ($v) => (int) $v);

        return [
            'total_sisa' => (int) $perBucket->sum(),
            'per_bucket' => $perBucket,
        ];
    }
}
