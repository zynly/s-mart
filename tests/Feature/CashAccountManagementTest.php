<?php

use App\Models\CashAccount;
use App\Models\Outlet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * REVISI-R1-v2.md §1.7 — halaman Kelola Laci: owner/admin bisa
 * tambah/ubah akun kas per outlet, dan laci yang sedang dipakai sesi
 * kasir terbuka tidak boleh dinonaktifkan.
 */
it('allows an admin to create a new cash drawer for an outlet', function () {
    $admin = User::role('admin')->firstOrFail();
    $outlet = Outlet::first();

    $code = 'LACI-'.uniqid();
    $this->actingAs($admin)
        ->post(route('admin.cash-accounts.store'), [
            'code' => $code,
            'name' => 'Laci Kasir 2',
            'type' => 'cash',
            'outlet_id' => $outlet->id,
            'opening_balance' => 100000,
            'is_drawer' => true,
            'is_active' => true,
        ])
        ->assertSessionDoesntHaveErrors();

    $this->assertDatabaseHas('cash_accounts', ['code' => $code, 'outlet_id' => $outlet->id, 'is_drawer' => true]);
});

it('refuses to deactivate a drawer that is currently used by an open cashier session', function () {
    $fixture = posFixture();
    $admin = User::role('admin')->firstOrFail();
    $drawer = CashAccount::withoutGlobalScope('outlet')->findOrFail($fixture['session']->cash_account_id);

    $this->actingAs($admin)
        ->put(route('admin.cash-accounts.update', $drawer), [
            'code' => $drawer->code,
            'name' => $drawer->name,
            'type' => $drawer->type,
            'outlet_id' => $drawer->outlet_id,
            'is_drawer' => true,
            'is_active' => false,
        ])
        ->assertSessionHasErrors('is_active');

    expect($drawer->fresh()->is_active)->toBeTrue();
});
