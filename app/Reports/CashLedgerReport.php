<?php

namespace App\Reports;

use App\Models\CashTransaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Buku Kas — mutasi semua akun kas (spec item 16). Beda dari Buku
 * Besar Fase 13 (per akun GL dari journal_entries): ini sumbernya
 * cash_transactions langsung, granularitas fisik laci/brankas/bank,
 * bukan akuntansi double-entry.
 */
class CashLedgerReport extends BaseReport
{
    public function key(): string
    {
        return 'cash-ledger';
    }

    public function title(): string
    {
        return 'Buku Kas';
    }

    public function category(): string
    {
        return 'keuangan';
    }

    public function requiredPermission(): string
    {
        return 'cash.view';
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
        return CashTransaction::query()
            ->join('cash_accounts', 'cash_accounts.id', '=', 'cash_transactions.cash_account_id')
            ->when($filters['date_from'] ?? null, fn ($q, $v) => $q->whereDate('cash_transactions.transaction_date', '>=', $v))
            ->when($filters['date_to'] ?? null, fn ($q, $v) => $q->whereDate('cash_transactions.transaction_date', '<=', $v))
            ->when($filters['outlet_id'] ?? null, fn ($q, $v) => $q->where('cash_transactions.outlet_id', $v))
            ->selectRaw("cash_transactions.id, cash_transactions.transaction_date as tanggal, cash_transactions.reference as referensi, cash_accounts.name as akun, cash_transactions.type as tipe, (CASE WHEN cash_transactions.type = 'out' THEN -cash_transactions.amount ELSE cash_transactions.amount END) as jumlah, cash_transactions.balance_after as saldo, cash_transactions.description as keterangan")
            ->orderByDesc('cash_transactions.transaction_date')
            ->orderByDesc('cash_transactions.id');
    }

    public function columns(User $user): array
    {
        return [
            ['key' => 'tanggal', 'label' => 'Tanggal', 'type' => 'date'],
            ['key' => 'referensi', 'label' => 'Referensi', 'type' => 'text'],
            ['key' => 'akun', 'label' => 'Akun Kas', 'type' => 'text'],
            ['key' => 'tipe', 'label' => 'Tipe', 'type' => 'text'],
            ['key' => 'jumlah', 'label' => 'Jumlah', 'type' => 'signed_money'],
            ['key' => 'saldo', 'label' => 'Saldo', 'type' => 'money'],
            ['key' => 'keterangan', 'label' => 'Keterangan', 'type' => 'text'],
        ];
    }

    public function summary(Builder $query, User $user): array
    {
        $rows = $query->get();

        return [
            'masuk' => (int) $rows->where('jumlah', '>', 0)->sum('jumlah'),
            'keluar' => (int) abs($rows->where('jumlah', '<', 0)->sum('jumlah')),
        ];
    }
}
