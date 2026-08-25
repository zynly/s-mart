<?php

use App\Models\CashAccount;
use App\Models\CashierSession;
use App\Models\Guardian;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\User;
use App\Services\CashierSessionService;
use App\Services\DepositService;
use App\Services\TopupRequestService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Database\Seeders\AccountSeeder;

uses(DatabaseTransactions::class);

beforeEach(function () {
    test()->seed(AccountSeeder::class);
    $this->fixture = posFixture();

    $this->outlet = $this->fixture['outlet'];
    $this->cashier = $this->fixture['cashier'];
    $this->admin = $this->fixture['admin'];
    $this->product = $this->fixture['product'];
    $this->cashAccount = $this->fixture['cashAccount'];
    $this->session = $this->fixture['session'];

    // Set PIN 123456 dan permission lengkap
    $this->cashier->update(['pin' => '123456']);
    $this->admin->update(['pin' => '123456']);

    \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'sale.create', 'guard_name' => 'web']);
    \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'pos.view', 'guard_name' => 'web']);
    \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'pos.create', 'guard_name' => 'web']);
    \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'topup.view', 'guard_name' => 'web']);
    \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'topup.approve', 'guard_name' => 'web']);

    $this->cashier->givePermissionTo(['sale.create', 'pos.view', 'pos.create']);
    $this->admin->givePermissionTo(['sale.create', 'pos.view', 'pos.create', 'topup.view', 'topup.approve']);

    $this->member = Member::firstOrCreate(
        ['member_number' => 'MBR-E2E-001'],
        [
            'name' => 'Santri E2E Test',
            'pin' => '123456',
            'credit_limit' => 200000,
            'current_receivable' => 0,
            'is_active' => true,
        ]
    );
    $this->member->update(['pin' => '123456']);

    // Isi saldo deposit member secara valid melalui DepositService
    app(DepositService::class)->bonus($this->member, 100000, 'Saldo Awal Test', 'bonus-key-'.uniqid());

    $this->guardian = Guardian::firstOrCreate(
        ['phone' => '081299887766'],
        [
            'name' => 'Wali Santri E2E',
            'password' => 'password',
        ]
    );

    $this->pmCash = PaymentMethod::where('type', 'cash')->first();
    $this->pmDeposit = PaymentMethod::where('type', 'deposit')->first();
    $this->pmCredit = PaymentMethod::where('type', 'credit')->first();

    $this->price = activeBasePrice($this->product, $this->outlet);
});

it('can fetch cashier session detail with JSON without 500 error (Fase 1)', function () {
    $this->actingAs($this->cashier);

    $response = $this->getJson(route('admin.cashier-session.show', $this->session->id));

    $response->assertStatus(200);
    $response->assertJsonStructure([
        'session' => ['id', 'reference', 'status', 'user_name', 'drawer_name', 'outlet_name', 'opening_cash'],
        'cash_transactions',
        'sales',
    ]);
});

it('can render topup requests index without 500 error (Fase 1)', function () {
    $this->actingAs($this->admin);

    $response = $this->get(route('admin.topup-requests.index'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/TopupRequests/Index', false)
        ->has('topupRequests')
    );
});

it('enforces cashier PIN for cash sale payment (Fase 2)', function () {
    $this->actingAs($this->cashier);
    $qty = 1;
    $amount = $this->price * $qty;

    // Transaksi Tunai Tanpa PIN / PIN Salah -> Harap Gagal (ValidationException pada items/payments)
    $responseFail = $this->withHeader('X-Idempotency-Key', Str::uuid()->toString())
        ->post(route('pos.sales.store'), [
            'outlet_id' => $this->outlet->id,
            'cashier_session_id' => $this->session->id,
            'items' => [
                ['product_id' => $this->product->id, 'unit_id' => $this->product->base_unit_id, 'qty' => $qty, 'unit_price' => $this->price, 'product_name' => $this->product->name, 'unit_code' => 'PCS'],
            ],
            'payments' => [
                [
                    'payment_method_id' => $this->pmCash->id,
                    'amount' => $amount,
                    'received_amount' => $amount,
                    'pin' => '000000',
                ],
            ],
        ]);

    $responseFail->assertSessionHasErrors(['items']);

    // Transaksi Tunai dengan PIN Kasir Benar (123456) -> Berhasil
    $responseSuccess = $this->withHeader('X-Idempotency-Key', Str::uuid()->toString())
        ->post(route('pos.sales.store'), [
            'outlet_id' => $this->outlet->id,
            'cashier_session_id' => $this->session->id,
            'items' => [
                ['product_id' => $this->product->id, 'unit_id' => $this->product->base_unit_id, 'qty' => $qty, 'unit_price' => $this->price, 'product_name' => $this->product->name, 'unit_code' => 'PCS'],
            ],
            'payments' => [
                [
                    'payment_method_id' => $this->pmCash->id,
                    'amount' => $amount,
                    'received_amount' => $amount,
                    'pin' => '123456',
                ],
            ],
        ]);

    $responseSuccess->assertRedirect();
    $responseSuccess->assertSessionHas('completed_sale_id');
});

it('enforces member PIN for deposit payment (Fase 2)', function () {
    $this->actingAs($this->cashier);
    $qty = 1;
    $amount = $this->price * $qty;

    // Deposit Tanpa PIN / PIN Salah -> Harap Gagal (ValidationException pada payments)
    $responseFail = $this->withHeader('X-Idempotency-Key', Str::uuid()->toString())
        ->post(route('pos.sales.store'), [
            'outlet_id' => $this->outlet->id,
            'cashier_session_id' => $this->session->id,
            'member_id' => $this->member->id,
            'items' => [
                ['product_id' => $this->product->id, 'unit_id' => $this->product->base_unit_id, 'qty' => $qty, 'unit_price' => $this->price, 'product_name' => $this->product->name, 'unit_code' => 'PCS'],
            ],
            'payments' => [
                [
                    'payment_method_id' => $this->pmDeposit->id,
                    'amount' => $amount,
                    'received_amount' => $amount,
                    'pin' => '999999',
                ],
            ],
        ]);

    $responseFail->assertSessionHasErrors(['payments']);

    // Deposit dengan PIN Anggota Benar (123456) -> Berhasil
    $responseSuccess = $this->withHeader('X-Idempotency-Key', Str::uuid()->toString())
        ->post(route('pos.sales.store'), [
            'outlet_id' => $this->outlet->id,
            'cashier_session_id' => $this->session->id,
            'member_id' => $this->member->id,
            'items' => [
                ['product_id' => $this->product->id, 'unit_id' => $this->product->base_unit_id, 'qty' => $qty, 'unit_price' => $this->price, 'product_name' => $this->product->name, 'unit_code' => 'PCS'],
            ],
            'payments' => [
                [
                    'payment_method_id' => $this->pmDeposit->id,
                    'amount' => $amount,
                    'received_amount' => $amount,
                    'pin' => '123456',
                ],
            ],
        ]);

    $responseSuccess->assertRedirect();
    $responseSuccess->assertSessionHas('completed_sale_id');
});

it('sends notification to admins upon topup request submission (Fase 4)', function () {
    $service = app(TopupRequestService::class);

    $topupRequest = $service->submit(
        $this->guardian,
        $this->member,
        50000,
        null,
        'BSI',
        'Wali Santri',
        now()->format('Y-m-d')
    );

    expect($topupRequest)->not->toBeNull();
    expect($topupRequest->status)->toBe('pending');
    expect($topupRequest->amount)->toBe(50000);

    $notification = $this->admin->notifications()->latest()->first();
    expect($notification)->not->toBeNull();
    expect($notification->data['dedupe_key'])->toBe("topup-request-{$topupRequest->id}");
    expect($notification->data['title'])->toContain('Pengajuan Top-Up Baru');
});
