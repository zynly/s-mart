<?php

use App\Models\Account;
use App\Models\CashAccount;
use App\Models\ConsignmentSettlement;
use App\Models\Supplier;
use App\Models\User;
use App\Services\CashService;
use App\Services\ConsignmentService;
use App\Services\JournalService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Audit independen (2026-08-02), Fase 4 — Temuan Kritis #5 (akun
 * nonaktif tidak menghentikan posting tapi hilang dari laporan),
 * Temuan Tinggi (race condition penutupan periode) & (konsinyasi
 * double-payment).
 */
function freshLeafAccounts(): array
{
    $asset = Account::create([
        'code' => '1-9901', 'name' => 'Uji Aset', 'type' => 'asset',
        'normal_balance' => 'debit', 'level' => 1, 'is_system' => false, 'is_active' => true,
    ]);
    $revenue = Account::create([
        'code' => '4-9901', 'name' => 'Uji Pendapatan', 'type' => 'revenue',
        'normal_balance' => 'credit', 'level' => 1, 'is_system' => false, 'is_active' => true,
    ]);

    return [$asset, $revenue];
}

it('rejects posting a new journal entry to an inactive account', function () {
    [$asset, $revenue] = freshLeafAccounts();
    $journalService = app(JournalService::class);

    // Sanity: berhasil selagi aktif.
    $journalService->record('general', [
        ['account_code' => $asset->code, 'debit' => 10000, 'credit' => 0],
        ['account_code' => $revenue->code, 'debit' => 0, 'credit' => 10000],
    ]);

    $asset->update(['is_active' => false]);

    expect(fn () => $journalService->record('general', [
        ['account_code' => $asset->code, 'debit' => 5000, 'credit' => 0],
        ['account_code' => $revenue->code, 'debit' => 0, 'credit' => 5000],
    ]))->toThrow(DomainException::class);
});

it('still shows an inactive account with historical balance in the trial balance and balance sheet', function () {
    [$asset, $revenue] = freshLeafAccounts();
    $journalService = app(JournalService::class);

    $journalService->record('general', [
        ['account_code' => $asset->code, 'debit' => 25000, 'credit' => 0],
        ['account_code' => $revenue->code, 'debit' => 0, 'credit' => 25000],
    ]);

    $asset->update(['is_active' => false]);

    $trialBalance = $journalService->getTrialBalance(now());
    $balanceSheet = $journalService->getBalanceSheet(now());

    expect($trialBalance->pluck('account.code'))->toContain($asset->code)
        ->and(collect($balanceSheet['assets'])->pluck('code'))->toContain($asset->code);
});

it('blocks deactivating an account that still has a non-zero balance via the admin endpoint', function () {
    [$asset, $revenue] = freshLeafAccounts();
    app(JournalService::class)->record('general', [
        ['account_code' => $asset->code, 'debit' => 15000, 'credit' => 0],
        ['account_code' => $revenue->code, 'debit' => 0, 'credit' => 15000],
    ]);

    $admin = User::role('admin')->firstOrFail();
    $this->actingAs($admin)
        ->put(route('admin.accounts.update', $asset), ['name' => $asset->name, 'is_active' => false])
        ->assertSessionHasErrors('is_active');

    expect($asset->fresh()->is_active)->toBeTrue();
});

it('allows deactivating an account with a zero balance', function () {
    [$asset] = freshLeafAccounts();

    $admin = User::role('admin')->firstOrFail();
    $this->actingAs($admin)
        ->put(route('admin.accounts.update', $asset), ['name' => $asset->name, 'is_active' => false])
        ->assertSessionDoesntHaveErrors();

    expect($asset->fresh()->is_active)->toBeFalse();
});

it('rejects a second markPaid() call on the same consignment settlement (prevents double cash withdrawal)', function () {
    $fixture = posFixture();
    $supplier = Supplier::first();
    $cashAccount = CashAccount::where('is_drawer', true)->where('is_active', true)->first();

    app(CashService::class)->recordIn($cashAccount, 1000000, null, 'dana awal uji konsinyasi', null, null);
    $balanceAfterFunding = $cashAccount->fresh()->current_balance;

    $settlement = ConsignmentSettlement::create([
        'reference' => 'KON-TEST-0001',
        'supplier_id' => $supplier->id,
        'outlet_id' => $fixture['outlet']->id,
        'period_start' => now()->subMonth(),
        'period_end' => now(),
        'total_sold' => 100000,
        'commission_percent' => 10,
        'commission_amount' => 10000,
        'payable_amount' => 90000,
        'status' => 'approved',
        'created_by' => $fixture['admin']->id,
        'approved_by' => $fixture['admin']->id,
    ]);

    $consignmentService = app(ConsignmentService::class);
    $consignmentService->markPaid($settlement, $cashAccount);

    expect($cashAccount->fresh()->current_balance)->toBe($balanceAfterFunding - 90000);

    // Panggilan kedua (klik ganda/retry) — HARUS ditolak, kas TIDAK
    // boleh berkurang lagi.
    expect(fn () => $consignmentService->markPaid($settlement->fresh(), $cashAccount))
        ->toThrow(DomainException::class);

    expect($cashAccount->fresh()->current_balance)->toBe($balanceAfterFunding - 90000);
});

it('still rejects new journal entries for a closed period after the locking refactor (regression guard)', function () {
    [$asset, $revenue] = freshLeafAccounts();
    $journalService = app(JournalService::class);
    $owner = User::role('owner')->firstOrFail();

    $lastMonth = now()->subMonthNoOverflow();

    $journalService->record('general', [
        ['account_code' => $asset->code, 'debit' => 5000, 'credit' => 0],
        ['account_code' => $revenue->code, 'debit' => 0, 'credit' => 5000],
    ], null, $lastMonth);

    $journalService->closePeriod($lastMonth->year, $lastMonth->month, $owner);

    expect(fn () => $journalService->record('general', [
        ['account_code' => $asset->code, 'debit' => 1000, 'credit' => 0],
        ['account_code' => $revenue->code, 'debit' => 0, 'credit' => 1000],
    ], null, $lastMonth))->toThrow(DomainException::class);
});
