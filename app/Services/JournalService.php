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
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
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

            $now = now();

            JournalEntry::insert($entries->map(fn (JournalEntry $entry) => [
                'journal_id' => $reversing->id,
                'account_id' => $entry->account_id,
                'debit' => $entry->credit,
                'credit' => $entry->debit,
                'description' => $entry->description !== null ? "Pembalik: {$entry->description}" : null,
                'memo' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all());

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
            ->selectRaw('accounts.code, accounts.name, accounts.type, accounts.subtype, SUM(journal_entries.debit) as total_debit, SUM(journal_entries.credit) as total_credit')
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

                // Audit Fase 7 (Temuan Rendah): BUKAN hardcode kode akun
                // literal lagi — akun HPP baru (mis. dipecah per kategori)
                // otomatis ikut terhitung selama ditandai subtype=cogs
                // saat dibuat, bukan diam-diam terlewat.
                if ($row->subtype === 'cogs') {
                    $totalCogs += $amount;
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
            $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
            $endDate = $startDate->copy()->endOfMonth();

            // Audit Fase 4 (Temuan Tinggi): kunci baris YANG SAMA yang
            // dipakai assertPeriodOpen() — record() yang dipanggil di
            // bawah (untuk jurnal penutup) akan re-lock baris ini di
            // transaksi yang SAMA (aman, row lock re-entrant per
            // transaksi), sehingga closePeriod() dan record()/createManual()
            // konkuren pada periode yang sama benar-benar terserialisasi.
            $period = AccountingPeriod::firstOrCreate(
                ['year' => $year, 'month' => $month],
                ['start_date' => $startDate, 'end_date' => $endDate, 'status' => 'open'],
            );
            $locked = AccountingPeriod::whereKey($period->id)->lockForUpdate()->first();

            if ($locked->status !== 'open') {
                throw new DomainException("Periode {$month}/{$year} sudah ditutup.");
            }

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

            $locked->update([
                'start_date' => $startDate,
                'end_date' => $endDate,
                'status' => 'closed',
                'closed_by' => $owner->id,
                'closed_at' => now(),
            ]);
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
        $accountsByCode = $this->accountsByCode();
        // isLeaf() aslinya query children()->exists() per akun — dengan
        // seluruh chart of accounts sudah di memori (kecil, di-cache),
        // status leaf dihitung dari situ juga (sama teknik leafAccounts()
        // di bawah), tanpa query tambahan per baris entri.
        $parentIds = $accountsByCode->pluck('parent_id')->filter()->unique();

        foreach ($entries as $line) {
            $account = $accountsByCode->get($line['account_code']);

            if ($account === null) {
                throw (new ModelNotFoundException)->setModel(Account::class);
            }

            if ($parentIds->contains($account->id)) {
                throw new DomainException("Akun \"{$account->code} {$account->name}\" adalah akun header — tidak bisa diposting langsung.");
            }

            // Audit Fase 4 (Temuan Kritis #5): sebelumnya menonaktifkan
            // akun (is_active=false) tidak menghentikan posting BARU sama
            // sekali — akun itu tetap bisa dipakai transaksi berikutnya,
            // cuma diam-diam MENGHILANG dari Neraca/Trial Balance
            // (leafAccounts() memfilter is_active) sehingga laporan bisa
            // timpang tanpa error apa pun. Ini SATU-SATUNYA titik semua
            // jurnal (otomatis observer maupun manual) lewat sini, jadi
            // cukup ditegakkan di sini saja.
            if (! $account->is_active) {
                throw new DomainException("Akun \"{$account->code} {$account->name}\" nonaktif — tidak bisa diposting.");
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
        $now = now();

        // T-107: dulu N query INSERT (satu per baris entri, tiap nota
        // penjualan minimal 4-6 baris) — tidak ada Observer terdaftar di
        // JournalEntry (dicek app/Providers/*ServiceProvider), jadi aman
        // dibungkus jadi 1 statement INSERT batch.
        JournalEntry::insert(array_map(fn ($line) => [
            'journal_id' => $journal->id,
            'account_id' => $line['account']->id,
            'debit' => $line['debit'],
            'credit' => $line['credit'],
            'description' => $line['description'],
            'memo' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ], $resolved));
    }

    /**
     * Audit Fase 4 (Temuan Tinggi): sebelumnya SELECT biasa tanpa lock —
     * transaksi A baca periode "open", transaksi B (closePeriod())
     * commit menutup periode, A tetap lanjut INSERT jurnal & commit
     * setelahnya — jurnal baru lolos ke periode yang sudah closed.
     * Diperbaiki dengan `firstOrCreate()` (baris SELALU ada untuk
     * dikunci, bukan bergantung null=open) + `lockForUpdate()` — closePeriod()
     * mengunci baris YANG SAMA sebelum mengubah status, jadi kedua
     * operasi terserialisasi lewat row lock, bukan lagi baca-lalu-tulis
     * yang bisa saling silang antar transaksi.
     */
    private function assertPeriodOpen(Carbon $date): void
    {
        $period = AccountingPeriod::firstOrCreate(
            ['year' => $date->year, 'month' => $date->month],
            ['start_date' => $date->copy()->startOfMonth(), 'end_date' => $date->copy()->endOfMonth(), 'status' => 'open'],
        );

        $locked = AccountingPeriod::whereKey($period->id)->lockForUpdate()->first();

        if ($locked->status !== 'open') {
            throw new DomainException('Periode akuntansi '.$date->format('m/Y').' sudah ditutup — tidak bisa menambah jurnal baru.');
        }
    }

    /**
     * Audit Fase 4 (Temuan Kritis #5): TIDAK LAGI memfilter is_active —
     * dipakai getTrialBalance()/getBalanceSheet(), yang WAJIB tetap
     * menampilkan akun nonaktif yang masih punya saldo historis (baris
     * bersaldo nol sudah tersaring terpisah oleh masing-masing method
     * pemanggil, `$row->debit !== 0 || $row->credit !== 0` / `$balance
     * === 0`). Larangan POSTING BARU ke akun nonaktif ditegakkan di
     * resolveEntries(), bukan di sini — dua kebutuhan berbeda yang
     * sebelumnya keliru disatukan lewat filter yang sama.
     */
    private function leafAccounts(): Collection
    {
        $accounts = $this->accountsByCode()->values();
        $parentIds = $accounts->pluck('parent_id')->filter()->unique();

        return $accounts->reject(fn (Account $a) => $parentIds->contains($a->id))->values();
    }

    /**
     * Dipakai AccountController::update() — menonaktifkan akun yang
     * masih punya saldo berjalan disengaja diblokir (Fase 4), supaya
     * saldo itu tidak "hilang" dari laporan tanpa proses tutup-saldo
     * yang jelas.
     */
    public function hasNonZeroBalance(Account $account): bool
    {
        $sums = $account->entries()
            ->whereHas('journal', fn ($q) => $q->whereIn('status', ['posted', 'reversed']))
            ->selectRaw('COALESCE(SUM(debit),0) as total_debit, COALESCE(SUM(credit),0) as total_credit')
            ->first();

        $debit = (int) $sums->total_debit;
        $credit = (int) $sums->total_credit;
        $balance = $account->normal_balance === 'debit' ? $debit - $credit : $credit - $debit;

        return $balance !== 0;
    }

    /**
     * T-107: seluruh chart of accounts di-cache sekali (tabel kecil, jarang
     * berubah, tapi dibaca di SETIAP posting jurnal — 1-2x per baris
     * transaksi sebelumnya). Cache dibatalkan otomatis lewat Account::booted()
     * begitu ada akun dibuat/diubah/dihapus.
     *
     * @return Collection<string, Account>
     */
    private function accountsByCode(): Collection
    {
        return Cache::remember('accounts.by_code', 3600, fn () => Account::all()->keyBy('code'));
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
