<?php

namespace App\Reports;

use App\Models\Receivable;
use App\Models\User;
use App\Support\AgingBucket;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Wrapper tipis di atas aturan bucket yang sama persis dengan
 * ReceivableService::getAging() (current/0-30/31-60/61-90/90+) —
 * getAging() sendiri TIDAK dipanggil di sini karena mengembalikan
 * Collection eager (bukan Builder), tidak cocok dipaginasi BaseReport
 * generik. Aturan bucket-nya diekspresikan ulang sebagai SQL lewat
 * AgingBucket::sqlCase() (DATEDIFF vs diffInDays yang sama), bukan
 * aturan baru.
 */
class ReceivableAgingReport extends BaseReport
{
    public function key(): string
    {
        return 'receivable-aging';
    }

    public function title(): string
    {
        return 'Laporan Piutang (Aging)';
    }

    public function category(): string
    {
        return 'piutang_hutang';
    }

    public function requiredPermission(): string
    {
        return 'receivable.view';
    }

    public function filters(): array
    {
        return [
            ['key' => 'outlet_id', 'label' => 'Outlet', 'type' => 'outlet'],
        ];
    }

    public function query(array $filters, User $user): Builder
    {
        return Receivable::query()
            ->join('members', 'members.id', '=', 'receivables.member_id')
            ->whereIn('receivables.status', ['unpaid', 'partial', 'overdue'])
            ->when($filters['outlet_id'] ?? null, fn ($q, $v) => $q->where('receivables.outlet_id', $v))
            ->selectRaw('receivables.id, receivables.reference as referensi, members.name as anggota, receivables.total_amount as total, receivables.paid_amount as dibayar, receivables.remaining_amount as sisa, receivables.due_date as jatuh_tempo, ('.AgingBucket::sqlCase('receivables.due_date').') as bucket')
            ->orderBy('receivables.due_date');
    }

    public function columns(User $user): array
    {
        return [
            ['key' => 'referensi', 'label' => 'Referensi', 'type' => 'text'],
            ['key' => 'anggota', 'label' => 'Anggota', 'type' => 'text'],
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
