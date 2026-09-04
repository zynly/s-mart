<?php

namespace Tests\Feature;

use App\Models\CashAccount;
use App\Models\CashierSession;
use App\Models\CashTransaction;
use App\Models\Outlet;
use App\Models\User;
use App\Services\CashierSessionService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class CashTransactionSourceTest extends TestCase
{
    use DatabaseTransactions;

    private Outlet $outlet;
    private User $admin;
    private User $cashier;
    private CashAccount $bankAccount;
    private CashAccount $drawerAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->outlet = Outlet::first() ?? Outlet::create([
            'code' => 'OUT-TEST-CASH',
            'name' => 'Outlet Uji Kas',
            'is_main' => true,
            'is_active' => true,
        ]);

        $this->admin = User::firstOrCreate(
            ['email' => 'admin-cash-test@s-mart.test'],
            [
                'name' => 'Admin Kas Test',
                'username' => 'admin_cash_test',
                'password' => bcrypt('password'),
                'outlet_id' => $this->outlet->id,
                'is_active' => true,
            ]
        );
        foreach (['cash.view', 'cash.create', 'cash.update', 'pos.view', 'pos.create'] as $perm) {
            \Spatie\Permission\Models\Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        $this->admin->givePermissionTo(['cash.view', 'cash.create', 'cash.update']);

        $this->cashier = User::firstOrCreate(
            ['email' => 'cashier-cash-test@s-mart.test'],
            [
                'name' => 'Kasir Kas Test',
                'username' => 'cashier_cash_test',
                'password' => bcrypt('password'),
                'pin' => bcrypt('123456'),
                'outlet_id' => $this->outlet->id,
                'is_active' => true,
            ]
        );
        $this->cashier->givePermissionTo(['pos.view', 'pos.create', 'cash.create']);

        $this->bankAccount = CashAccount::create([
            'code' => 'BANK-MANDIRI-TEST-'.uniqid(),
            'name' => 'Bank Mandiri Uji',
            'type' => 'bank',
            'outlet_id' => $this->outlet->id,
            'opening_balance' => 0,
            'current_balance' => 0,
            'is_drawer' => false,
            'is_active' => true,
            'is_default' => false,
        ]);

        $this->drawerAccount = CashAccount::create([
            'code' => 'DRAWER-TEST-'.uniqid(),
            'name' => 'Laci Kasir Uji',
            'type' => 'cash',
            'outlet_id' => $this->outlet->id,
            'opening_balance' => 0,
            'current_balance' => 0,
            'is_drawer' => true,
            'is_active' => true,
            'is_default' => true,
        ]);
    }

    public function test_admin_cash_in_without_active_cashier_session_succeeds_and_sets_session_null(): void
    {
        // Pastikan tidak ada sesi kasir aktif untuk admin
        CashierSession::where('user_id', $this->admin->id)->where('status', 'open')->delete();

        $initialBalance = $this->bankAccount->fresh()->current_balance;

        $response = $this->actingAs($this->admin)->post(route('admin.cash.in'), [
            'cash_account_id' => $this->bankAccount->id,
            'amount' => 1081122,
            'description' => 'Setoran modal Bank Mandiri via admin',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $this->assertEquals($initialBalance + 1081122, $this->bankAccount->fresh()->current_balance);

        $trx = CashTransaction::where('cash_account_id', $this->bankAccount->id)
            ->where('amount', 1081122)
            ->latest('id')
            ->first();

        $this->assertNotNull($trx);
        $this->assertNull($trx->cashier_session_id);
    }

    public function test_admin_cash_in_to_bank_when_session_exists_does_not_pollute_session(): void
    {
        // Buka sesi kasir aktif untuk kasir
        $session = app(CashierSessionService::class)->open($this->cashier, $this->drawerAccount, 200000);
        $initialExpected = app(CashierSessionService::class)->calculateExpected($session);

        // Admin mencatat kas masuk ke Bank Mandiri
        $response = $this->actingAs($this->admin)->post(route('admin.cash.in'), [
            'cash_account_id' => $this->bankAccount->id,
            'amount' => 500000,
            'description' => 'Penerimaan non-laci',
        ]);

        $response->assertSessionHasNoErrors();

        // Verifikasi: Sesi kasir sama sekali TIDAK terpengaruh
        $session->refresh();
        $this->assertEquals(0, $session->total_cash_in);
        $this->assertEquals($initialExpected, app(CashierSessionService::class)->calculateExpected($session));

        $trx = CashTransaction::where('cash_account_id', $this->bankAccount->id)
            ->where('amount', 500000)
            ->latest('id')
            ->first();

        $this->assertNotNull($trx);
        $this->assertNull($trx->cashier_session_id);
    }

    public function test_pos_cash_in_requires_active_session_and_updates_session(): void
    {
        // 1. Jika is_pos = true tapi belum ada sesi aktif -> validasi gagal
        CashierSession::where('user_id', $this->cashier->id)->where('status', 'open')->delete();

        $responseFail = $this->actingAs($this->cashier)->post(route('admin.cash.in'), [
            'cash_account_id' => $this->drawerAccount->id,
            'amount' => 50000,
            'description' => 'Kas masuk laci kasir',
            'is_pos' => true,
        ]);

        $responseFail->assertSessionHasErrors('cash_account_id');

        // 2. Jika ada sesi aktif -> berhasil dan meng-update total_cash_in sesi
        $session = app(CashierSessionService::class)->open($this->cashier, $this->drawerAccount, 100000);

        $responseSuccess = $this->actingAs($this->cashier)->post(route('admin.cash.in'), [
            'cash_account_id' => $this->drawerAccount->id,
            'amount' => 50000,
            'description' => 'Kas masuk laci kasir',
            'is_pos' => true,
        ]);

        $responseSuccess->assertSessionHasNoErrors();

        $session->refresh();
        $this->assertEquals(50000, $session->total_cash_in);
        $this->assertEquals(150000, app(CashierSessionService::class)->calculateExpected($session));

        $trx = CashTransaction::where('cash_account_id', $this->drawerAccount->id)
            ->where('amount', 50000)
            ->latest('id')
            ->first();

        $this->assertNotNull($trx);
        $this->assertEquals($session->id, $trx->cashier_session_id);
    }
}
