<?php

namespace Tests\Feature;

use App\Models\CashAccount;
use App\Models\CashierSession;
use App\Models\Outlet;
use App\Models\User;
use App\Services\CashierSessionService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class CashierSessionTest extends TestCase
{
    use DatabaseTransactions;

    protected Outlet $outlet;
    protected User $cashier;
    protected CashAccount $cashAccount;

    protected function setUp(): void
    {
        parent::setUp();

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
        Permission::firstOrCreate(['name' => 'pos.view', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'pos.create', 'guard_name' => 'web']);
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
    }

    public function test_can_render_cashier_session_index_page(): void
    {
        $this->actingAs($this->cashier);

        $response = $this->get(route('admin.cashier-session.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/CashierSession/Index', false)
            ->has('cashAccounts')
        );
    }

    public function test_can_open_cashier_session_successfully(): void
    {
        $this->actingAs($this->cashier);

        $response = $this->post(route('admin.cashier-session.open'), [
            'cash_account_id' => $this->cashAccount->id,
            'opening_cash' => 150000,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $session = CashierSession::where('user_id', $this->cashier->id)->where('status', 'open')->first();
        $this->assertNotNull($session);
        $this->assertSame(150000, $session->opening_cash);
        $this->assertSame($this->outlet->id, $session->outlet_id);
        $this->assertSame($this->cashAccount->id, $session->cash_account_id);
    }

    public function test_can_open_cashier_session_with_secondary_drawer_account_for_active_outlet(): void
    {
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
        $this->assertNotNull($session);
        $this->assertSame(200000, $session->opening_cash);
        $this->assertSame($this->outlet->id, $session->outlet_id);
        $this->assertSame($secondaryAccount->id, $session->cash_account_id);
    }

    public function test_returns_422_validation_error_instead_of_500_when_session_is_already_open(): void
    {
        $this->actingAs($this->cashier);

        app(CashierSessionService::class)->open($this->cashier, $this->cashAccount, 100000);

        $response = $this->post(route('admin.cashier-session.open'), [
            'cash_account_id' => $this->cashAccount->id,
            'opening_cash' => 50000,
        ]);

        $response->assertStatus(302);
        $response->assertSessionHasErrors(['cash_account_id']);
    }

    public function test_updates_cash_account_balance_when_session_is_opened_closed_or_force_closed(): void
    {
        $this->actingAs($this->cashier);
        $service = app(CashierSessionService::class);

        // Open session with 100,000
        $session = $service->open($this->cashier, $this->cashAccount, 100000);
        $this->assertSame(100000, (int) $this->cashAccount->fresh()->current_balance);

        // Add sales cash
        $service->addSaleCash($session, 50000);
        $this->assertSame(150000, $service->calculateExpected($session));

        // Close session with actual cash 150,000
        $service->close($session, 150000);
        $this->assertSame(150000, (int) $this->cashAccount->fresh()->current_balance);

        // Reopen and force close
        $session2 = $service->open($this->cashier, $this->cashAccount, 150000);
        $service->addSaleCash($session2, 25000);
        $service->forceClose($session2);
        $this->assertSame(175000, (int) $this->cashAccount->fresh()->current_balance);
    }
}
