<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\CashAccount;
use App\Models\Journal;
use App\Models\JournalEntry;
use App\Models\PaymentMethod;
use App\Models\User;
use App\Support\ReferenceGenerator;
use Carbon\Carbon;
use DomainException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * T-080. Jantung akuntansi double-entry. record() dipakai Observer
 * (jurnal OTOMATIS, langsung posted, tidak perlu review — sudah pasti
 * seimbang karena dihitung dari data transaksi asli). createManual()+
 * post() untuk jurnal manual treasurer/owner (draft dulu, wajib
 * direview sebelum masuk hitungan laporan).
 */
class JournalService
{
    /**
     * @param  array<int, array{account_code:string, debit?:int, credit?:int, description?:string}>  $entries
     */
    public function record(
        string $type,
        array $entries,
        ?Model $source = null,
        ?Carbon $date = null,
        ?string $description = null,
        ?int $outletId = null,
    ): Journal {
        $date ??= now();

        return DB::transaction(function () use ($type, $entries, $source, $date, $description, $outletId) {
            $this->assertPeriodOpen($date);
            [$resolved, $totalDebit, $totalCredit] = $this->resolveEntries($entries);

            $journal = Journal::create([
                'reference' => ReferenceGenerator::generate('JU', $outletId ?? 0),
                'outlet_id' => $outletId,
                'journal_date' => $date->toDateString(),
                'type' => $type,
                'description' => $description,
                'sourceable_type' => $source?->getMorphClass(),
                'sourceable_id' => $source?->getKey(),
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'is_balanced' => true,
                'status' => 'posted',
                'posted_at' => now(),
            ]);

            $this->writeEntries($journal, $resolved);

            return $journal->fresh('entries');
        });
    }

    /**
     * @param  array{journal_date:string, type?:string, description?:string, outlet_id?:int,
     *     entries: array<int, array{account_code:string, debit?:int, credit?:int, description?:string}>}  $data
     */
    public function createManual(array $data, User $creator): Journal
    {
        return DB::transaction(function () use ($data, $creator) {
            $date = Carbon::parse($data['journal_date']);
            $this->assertPeriodOpen($date);
            [$resolved, $totalDebit, $totalCredit] = $this->resolveEntries($data['entries']);

            $journal = Journal::create([
                'reference' => ReferenceGenerator::generate('JU', 0),
                'outlet_id' => $data['outlet_id'] ?? null,
                'journal_date' => $date->toDateString(),
                'type' => $data['type'] ?? 'general',
                'description' => $data['description'] ?? null,
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'is_balanced' => true,
                'status' => 'draft',
                'created_by' => $creator->id,
            ]);

            $this->writeEntries($journal, $resolved);

            return $journal->fresh('entries');
        });
    }

    public function post(Journal $journal, User $poster): Journal
    {
        return DB::transaction(function () use ($journal, $poster) {
            $locked = Journal::lockForUpdate()->findOrFail($journal->id);

            if ($locked->status !== 'draft') {
                throw new DomainException('Hanya jurnal berstatus draft yang bisa diposting.');
            }

            $this->assertPeriodOpen(Carbon::parse($locked->journal_date));

            $locked->update([
                'status' => 'posted',
                'posted_by' => $poster->id,
                'posted_at' => now(),
            ]);

            return $locked->fresh('entries');
        });
    }

    public function reverse(Journal $original, string $reason, ?User $actor = null): Journal
    {
        return DB::transaction(function () use ($original, $reason, $actor) {
            $locked = Journal::lockForUpdate()->findOrFail($original->id);

            if ($locked->status !== 'posted') {
                throw new DomainException('Hanya jurnal berstatus posted yang bisa dibalik.');
            }

            $this->assertPeriodOpen(now());

            $entries = JournalEntry::where('journal_id', $locked->id)->get();

            $reversing = Journal::create([
                'reference' => ReferenceGenerator::generate('JU', $locked->outlet_id ?? 0),
                'outlet_id' => $locked->outlet_id,
                'journal_date' => now()->toDateString(),
                'type' => 'reversing',
                'description' => "Pembalik {$locked->reference}: {$reason}",
                'sourceable_type' => $locked->sourceable_type,
                'sourceable_id' => $locked->sourceable_id,
                'total_debit' => $locked->total_credit,
                'total_credit' => $locked->total_debit,
                'is_balanced' => true,
                'status' => 'posted',
                'reversed_journal_id' => $locked->id,
                'created_by' => $actor?->id,
                'posted_by' => $actor?->id,
                'posted_at' => now(),
            ]);

            foreach ($entries as $entry) {
                JournalEntry::create([
                    'journal_id' => $reversing->id,
                    'account_id' => $entry->account_id,
                    'debit' => $entry->credit,
                    'credit' => $entry->debit,
                    'description' => $entry->description !== null ? "Pembalik: {$entry->description}" : null,
                ]);
            }

            $locked->update(['status' => 'reversed']);

            return $reversing->fresh('entries');
        });
    }

    public function getLedger(Account $account, Carbon $from, Carbon $to): Collection
    {
        return JournalEntry::query()
            ->join('journals', 'journals.id', '=', 'journal_entries.journal_id')
            ->where('journal_entries.account_id', $account->id)
            ->whereIn('journals.status', ['posted', 'reversed'])
            ->whereBetween('journals.journal_date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('journals.journal_date')
            ->orderBy('journal_entries.id')
            ->select(
                'journal_entries.*',
                'journals.reference as journal_reference',
                'journals.journal_date as journal_date',
                'journals.description as journal_description',
                'journals.type as journal_type',
            )
            ->get();
    }

    /**
     * @return Collection<int, object>
     */
    public function getTrialBalance(Carbon $asOf): Collection
    {
        $rows = $this->balancesUpTo($asOf);

        return $this->leafAccounts()
            ->map(function (Account $account) use ($rows) {
                $row = $rows->get($account->id);
                $debit = (int) ($row->total_debit ?? 0);
                $credit = (int) ($row->total_credit ?? 0);
                $balance = $account->normal_balance === 'debit' ? $debit - $credit : $credit - $debit;

                return (object) ['account' => $account, 'debit' => $debit, 'credit' => $credit, 'balance' => $balance];
            })
            ->filter(fn ($r) => $r->debit !== 0 || $r->credit !== 0)
            ->values();
    }

    /**
     * @return array{revenue:array, expense:array, totalRevenue:int, totalExpense:int, totalCogs:int, grossProfit:int, netProfit:int}
     */
    public function getProfitLoss(Carbon $from, Carbon $to): array
    {
        $rows = JournalEntry::query()
            ->join('journals', 'journals.id', '=', 'journal_entries.journal_id')
            ->join('accounts', 'accounts.id', '=', 'journal_entries.account_id')
            ->whereIn('journals.status', ['posted', 'reversed'])
            ->whereBetween('journals.journal_date', [$from->toDateString(), $to->toDateString()])
            ->whereIn('accounts.type', ['revenue', 'expense'])
            ->selectRaw('accounts.code, accounts.name, accounts.type, SUM(journal_entries.debit) as total_debit, SUM(journal_entries.credit) as total_credit')
            ->groupBy('accounts.id', 'accounts.code', 'accounts.name', 'accounts.type')
            ->get();

        $revenue = [];
        $expense = [];
        $totalRevenue = 0;
        $totalExpense = 0;
        $totalCogs = 0;

        // Konvensi seragam per TIPE akun (bukan normal_balance masing-
        // masing) supaya akun kontra (Retur/Diskon Penjualan, normal
        // debit tapi type=revenue) otomatis MENGURANGI total saat
        // dijumlah, bukan malah menambah.
        foreach ($rows as $row) {
            if ($row->type === 'revenue') {
                $amount = (int) $row->total_credit - (int) $row->total_debit;
                $revenue[] = ['code' => $row->code, 'name' => $row->name, 'amount' => $amount];
                $totalRevenue += $amount;
            } else {
                $amount = (int) $row->total_debit - (int) $row->total_credit;
                $expense[] = ['code' => $row->code, 'name' => $row->name, 'amount' => $amount];
                $totalExpense += $amount;

                if ($row->code === '5-1000') {
                    $totalCogs = $amount;
                }
            }
        }

        return [
            'revenue' => $revenue,
            'expense' => $expense,
            'totalRevenue' => $totalRevenue,
            'totalExpense' => $totalExpense,
            'totalCogs' => $totalCogs,
            'grossProfit' => $totalRevenue - $totalCogs,
            'netProfit' => $totalRevenue - $totalExpense,
        ];
    }

    /**
     * @return array{assets:array, liabilities:array, equity:array, totalAssets:int, totalLiabilities:int, totalEquity:int, isBalanced:bool}
     */
    public function getBalanceSheet(Carbon $asOf): array
    {
        $rows = $this->balancesUpTo($asOf);

        $assets = [];
        $liabilities = [];
        $equity = [];
        $totalAssets = 0;
        $totalLiabilities = 0;
        $totalEquity = 0;

        foreach ($this->leafAccounts() as $account) {
            if (! in_array($account->type, ['asset', 'liability', 'equity'], true)) {
                continue;
            }

            $row = $rows->get($account->id);
            $debit = (int) ($row->total_debit ?? 0);
            $credit = (int) ($row->total_credit ?? 0);
            $balance = $account->normal_balance === 'debit' ? $debit - $credit : $credit - $debit;

            if ($balance === 0) {
                continue;
            }

            $line = ['code' => $account->code, 'name' => $account->name, 'amount' => $balance];

            if ($account->type === 'asset') {
                $assets[] = $line;
                $totalAssets += $balance;
            } elseif ($account->type === 'liability') {
                $liabilities[] = $line;
                $totalLiabilities += $balance;
            } else {
                $equity[] = $line;
                $totalEquity += $balance;
            }
        }

        // Laba periode berjalan belum dipindah ke Laba Ditahan (baru
        // terjadi saat closePeriod) — supaya Aset = Kewajiban + Ekuitas
        // tetap seimbang di neraca interim (bukan cuma tepat sesaat
        // setelah tutup buku), tambahkan sebagai baris semu.
        $currentEarnings = $this->currentPeriodEarnings($asOf);

        if ($currentEarnings !== 0) {
            $equity[] = ['code' => null, 'name' => 'Laba Berjalan (belum ditutup)', 'amount' => $currentEarnings];
            $totalEquity += $currentEarnings;
        }

        return [
            'assets' => $assets,
            'liabilities' => $liabilities,
            'equity' => $equity,
            'totalAssets' => $totalAssets,
            'totalLiabilities' => $totalLiabilities,
            'totalEquity' => $totalEquity,
            'isBalanced' => $totalAssets === $totalLiabilities + $totalEquity,
        ];
    }

    /**
     * Jurnal penutup: tutup semua akun pendapatan & beban (termasuk
     * kontra) ke Ikhtisar Laba Rugi, lalu pindahkan ke Laba Ditahan.
     * Periode dikunci sesudahnya — record()/createManual() berikutnya
     * ke tanggal di periode ini akan ditolak (assertPeriodOpen()).
     */
    public function closePeriod(int $year, int $month, User $owner): void
    {
        DB::transaction(function () use ($year, $month, $owner) {
            $existing = AccountingPeriod::where('year', $year)->where('month', $month)->first();

            if ($existing !== null && $existing->status !== 'open') {
                throw new DomainException("Periode {$month}/{$year} sudah ditutup.");
            }

            $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
            $endDate = $startDate->copy()->endOfMonth();
            $pl = $this->getProfitLoss($startDate, $endDate);
            $netProfit = $pl['netProfit'];

            if ($netProfit !== 0) {
                $entries = [];

                foreach ([...$pl['revenue']] as $line) {
                    if ($line['amount'] === 0) {
                        continue;
                    }
                    $entries[] = $line['amount'] > 0
                        ? ['account_code' => $line['code'], 'debit' => $line['amount'], 'credit' => 0]
                        : ['account_code' => $line['code'], 'debit' => 0, 'credit' => abs($line['amount'])];
                }

                foreach ($pl['expense'] as $line) {
                    if ($line['amount'] === 0) {
                        continue;
                    }
                    $entries[] = ['account_code' => $line['code'], 'debit' => 0, 'credit' => $line['amount']];
                }

                $entries[] = $netProfit > 0
                    ? ['account_code' => '3-3000', 'debit' => 0, 'credit' => $netProfit]
                    : ['account_code' => '3-3000', 'debit' => abs($netProfit), 'credit' => 0];

                $this->record('closing', $entries, null, $endDate, "Jurnal penutup pendapatan & beban {$month}/{$year}", null);

                $retainedEntries = $netProfit > 0
                    ? [
                        ['account_code' => '3-3000', 'debit' => $netProfit, 'credit' => 0],
                        ['account_code' => '3-2000', 'debit' => 0, 'credit' => $netProfit],
                    ]
                    : [
                        ['account_code' => '3-3000', 'debit' => 0, 'credit' => abs($netProfit)],
                        ['account_code' => '3-2000', 'debit' => abs($netProfit), 'credit' => 0],
                    ];

                $this->record('closing', $retainedEntries, null, $endDate, "Ikhtisar Laba Rugi -> Laba Ditahan {$month}/{$year}", null);
            }

            AccountingPeriod::updateOrCreate(
                ['year' => $year, 'month' => $month],
                [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'status' => 'closed',
                    'closed_by' => $owner->id,
                    'closed_at' => now(),
                ],
            );
        });
    }

    public function reopenPeriod(int $year, int $month): void
    {
        $period = AccountingPeriod::where('year', $year)->where('month', $month)->firstOrFail();

        if ($period->status === 'locked') {
            throw new DomainException('Periode terkunci tidak bisa dibuka kembali.');
        }

        $period->update(['status' => 'open', 'closed_by' => null, 'closed_at' => null]);
    }

    /**
     * Peta CashAccount -> kode akun GL (Fase 13 §Temuan K). Dipakai
     * ulang oleh SaleObserver, CashTransactionObserver, dst supaya
     * pemetaan Kas Laci/Brankas/Bank/E-Wallet konsisten satu tempat.
     */
    public function resolveCashAccountCode(CashAccount $account): string
    {
        return match (true) {
            $account->type === 'cash' && $account->is_drawer => '1-1101',
            $account->type === 'cash' => '1-1102',
            $account->type === 'bank' => '1-1201',
            $account->type === 'ewallet' => '1-1300',
            default => '1-1101',
        };
    }

    /**
     * Peta payment_methods.type -> kode akun GL sisi debit penjualan
     * (Fase 13 §Temuan K). `voucher`/`point` SENGAJA tidak dipetakan di
     * sini (bukan akun neraca — jadi baris Diskon Penjualan, ditangani
     * langsung oleh SaleObserver, bukan lewat method ini).
     */
    public function resolvePaymentMethodAccountCode(PaymentMethod $method, ?CashAccount $cashAccount = null): string
    {
        if ($cashAccount !== null) {
            return $this->resolveCashAccountCode($cashAccount);
        }

        return match ($method->type) {
            'cash' => '1-1101',
            'card', 'transfer' => '1-1201',
            'qris', 'ewallet' => '1-1300',
            'deposit' => '2-1200',
            'credit' => '1-1500',
            'payroll' => '1-1450',
            default => '1-1101',
        };
    }

    /**
     * @param  array<int, array{account_code:string, debit?:int, credit?:int, description?:string}>  $entries
     * @return array{0: array<int, array{account:Account, debit:int, credit:int, description:?string}>, 1: int, 2: int}
     */
    private function resolveEntries(array $entries): array
    {
        $totalDebit = 0;
        $totalCredit = 0;
        $resolved = [];

        foreach ($entries as $line) {
            $account = Account::where('code', $line['account_code'])->firstOrFail();

            if (! $account->isLeaf()) {
                throw new DomainException("Akun \"{$account->code} {$account->name}\" adalah akun header — tidak bisa diposting langsung.");
            }

            $debit = (int) ($line['debit'] ?? 0);
            $credit = (int) ($line['credit'] ?? 0);
            $totalDebit += $debit;
            $totalCredit += $credit;

            $resolved[] = ['account' => $account, 'debit' => $debit, 'credit' => $credit, 'description' => $line['description'] ?? null];
        }

        if ($totalDebit !== $totalCredit) {
            throw new DomainException("Jurnal tidak seimbang: total debit {$totalDebit} != total kredit {$totalCredit}.");
        }

        if ($totalDebit === 0) {
            throw new DomainException('Jurnal tidak boleh kosong (total debit/kredit nol).');
        }

        return [$resolved, $totalDebit, $totalCredit];
    }

    /**
     * @param  array<int, array{account:Account, debit:int, credit:int, description:?string}>  $resolved
     */
    private function writeEntries(Journal $journal, array $resolved): void
    {
        foreach ($resolved as $line) {
            JournalEntry::create([
                'journal_id' => $journal->id,
                'account_id' => $line['account']->id,
                'debit' => $line['debit'],
                'credit' => $line['credit'],
                'description' => $line['description'],
            ]);
        }
    }

    private function assertPeriodOpen(Carbon $date): void
    {
        $period = AccountingPeriod::where('year', $date->year)->where('month', $date->month)->first();

        if ($period !== null && $period->status !== 'open') {
            throw new DomainException('Periode akuntansi '.$date->format('m/Y').' sudah ditutup — tidak bisa menambah jurnal baru.');
        }
    }

    private function leafAccounts(): Collection
    {
        $accounts = Account::where('is_active', true)->get();
        $parentIds = $accounts->pluck('parent_id')->filter()->unique();

        return $accounts->reject(fn (Account $a) => $parentIds->contains($a->id))->values();
    }

    private function balancesUpTo(Carbon $asOf): Collection
    {
        return JournalEntry::query()
            ->join('journals', 'journals.id', '=', 'journal_entries.journal_id')
            ->whereIn('journals.status', ['posted', 'reversed'])
            ->where('journals.journal_date', '<=', $asOf->toDateString())
            ->selectRaw('journal_entries.account_id, SUM(journal_entries.debit) as total_debit, SUM(journal_entries.credit) as total_credit')
            ->groupBy('journal_entries.account_id')
            ->get()
            ->keyBy('account_id');
    }

    private function currentPeriodEarnings(Carbon $asOf): int
    {
        $lastClosed = AccountingPeriod::where('status', '!=', 'open')->orderByDesc('end_date')->first();
        $from = $lastClosed !== null ? Carbon::parse($lastClosed->end_date)->addDay() : Carbon::createFromDate(2000, 1, 1);

        if ($from->greaterThan($asOf)) {
            return 0;
        }

        return $this->getProfitLoss($from, $asOf)['netProfit'];
    }
}
