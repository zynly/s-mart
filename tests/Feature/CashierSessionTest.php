<?php

use App\Models\CashAccount;
use App\Models\CashierSession;
use App\Models\Outlet;
use App\Models\User;
use App\Services\CashierSessionService;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

beforeEach(function () {
    $this->outlet = Outlet::create([
        'code' => 'OUT-TEST',
        'name' => 'Outlet Utama Test',
        'is_main' => true,
        'is_active' => true,
    ]);

    $this->cashier = User::factory()->create([
        'name' => 'Kasir Uji',
        'email' => 'kasir@test.com',
        'outlet_id' => $this->outlet->id,
    ]);
    \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'pos.view', 'guard_name' => 'web']);
    \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'pos.create', 'guard_name' => 'web']);
    $this->cashier->givePermissionTo(['pos.view', 'pos.create']);

    $this->cashAccount = CashAccount::create([
        'code' => 'LACI-01',
        'name' => 'Laci Kasir Test 1',
        'type' => 'cash',
        'outlet_id' => $this->outlet->id,
        'is_drawer' => true,
        'is_active' => true,
        'is_default' => true,
    ]);
});

it('can render cashier session index page', function () {
    $this->actingAs($this->cashier);

    $response = $this->get(route('admin.cashier-session.index'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/CashierSession/Index', false)
        ->has('cashAccounts')
    );
});

it('can open cashier session successfully', function () {
    $this->actingAs($this->cashier);

    $response = $this->post(route('admin.cashier-session.open'), [
        'cash_account_id' => $this->cashAccount->id,
        'opening_cash' => 150000,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $session = CashierSession::where('user_id', $this->cashier->id)->where('status', 'open')->first();
    expect($session)->not->toBeNull();
    expect($session->opening_cash)->toBe(150000);
    expect($session->outlet_id)->toBe($this->outlet->id);
    expect($session->cash_account_id)->toBe($this->cashAccount->id);
});

it('can open cashier session with secondary drawer account for active outlet', function () {
    $secondaryAccount = CashAccount::create([
        'code' => 'LACI-02',
        'name' => 'Laci Kasir Test 2',
        'type' => 'cash',
        'outlet_id' => $this->outlet->id,
        'is_drawer' => true,
        'is_active' => true,
    ]);

    $this->actingAs($this->cashier);

    $response = $this->post(route('admin.cashier-session.open'), [
        'cash_account_id' => $secondaryAccount->id,
        'opening_cash' => 200000,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $session = CashierSession::where('user_id', $this->cashier->id)->where('status', 'open')->first();
    expect($session)->not->toBeNull();
    expect($session->opening_cash)->toBe(200000);
    expect($session->outlet_id)->toBe($this->outlet->id);
    expect($session->cash_account_id)->toBe($secondaryAccount->id);
});

it('returns 422 validation error instead of 500 when session is already open', function () {
    $this->actingAs($this->cashier);

    app(CashierSessionService::class)->open($this->cashier, $this->cashAccount, 100000);

    $response = $this->post(route('admin.cashier-session.open'), [
        'cash_account_id' => $this->cashAccount->id,
        'opening_cash' => 50000,
    ]);

    $response->assertStatus(302);
    $response->assertSessionHasErrors(['cash_account_id']);
});
