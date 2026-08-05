<?php

use App\Models\Account;
use App\Models\User;
use App\Services\JournalService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Audit independen (2026-08-02), Fase 7 — Temuan Rendah: journal.approve
 * sebelumnya dipakai untuk DUA operasi beda risiko (post draft vs
 * reverse jurnal posted apa pun). Dipisah jadi journal.reverse,
 * eksklusif owner (pola sama seperti period.close).
 */
it('rejects a treasurer (journal.approve holder) from reversing a journal, but allows the owner', function () {
    $asset = Account::create(['code' => '1-9902', 'name' => 'Uji Aset Reverse', 'type' => 'asset', 'normal_balance' => 'debit', 'level' => 1, 'is_system' => false, 'is_active' => true]);
    $revenue = Account::create(['code' => '4-9902', 'name' => 'Uji Pendapatan Reverse', 'type' => 'revenue', 'normal_balance' => 'credit', 'level' => 1, 'is_system' => false, 'is_active' => true]);

    $journal = app(JournalService::class)->record('general', [
        ['account_code' => $asset->code, 'debit' => 10000, 'credit' => 0],
        ['account_code' => $revenue->code, 'debit' => 0, 'credit' => 10000],
    ]);

    $treasurer = User::role('treasurer')->firstOrFail();
    expect($treasurer->can('journal.approve'))->toBeTrue()
        ->and($treasurer->can('journal.reverse'))->toBeFalse();

    $this->actingAs($treasurer)
        ->put(route('admin.journals.reverse', $journal), ['reason' => 'uji izin treasurer'])
        ->assertForbidden();

    $owner = User::role('owner')->firstOrFail();
    expect($owner->can('journal.reverse'))->toBeTrue();

    $this->actingAs($owner)
        ->put(route('admin.journals.reverse', $journal), ['reason' => 'uji izin owner'])
        ->assertRedirect();
});
