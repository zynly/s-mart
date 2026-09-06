<?php

use App\Models\CashAccount;
use App\Models\ConsignmentSettlement;
use App\Models\StockLayer;
use App\Models\Supplier;
use App\Models\Unit;
use App\Services\ConsignmentService;
use App\Services\SaleService;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('allows previewing consignment settlement before saving', function () {
    $fixture = posFixture(stockQty: 0);
    $unit = Unit::find($fixture['product']->base_unit_id);
    $supplier = Supplier::create([
        'code' => 'SUP-PREVIEW-1',
        'name' => 'Supplier Preview Test',
        'phone' => '08123456789',
        'is_consignor' => true,
        'is_active' => true,
    ]);

    app(StockService::class)->addLayer(
        $fixture['product'],
        $fixture['outlet'],
        20,
        1000,
        isConsignment: true,
        supplierId: $supplier->id,
    );

    $price = activeBasePrice($fixture['product'], $fixture['outlet']);

    app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'idempotency_key' => 'test-preview-'.uniqid(),
        'items' => [
            ['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 3],
        ],
        'payments' => [
            ['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => $price * 3],
        ],
    ]);

    $response = $this->actingAs($fixture['user'])
        ->postJson(route('admin.consignment.preview'), [
            'supplier_id' => $supplier->id,
            'outlet_id' => $fixture['outlet']->id,
            'period_start' => now()->subDay()->toDateString(),
            'period_end' => now()->addDay()->toDateString(),
            'commission_percent' => 20,
        ]);

    $response->assertOk()
        ->assertJsonStructure([
            'overlapping',
            'total_sold',
            'commission_amount',
            'payable_amount',
            'items' => [
                '*' => ['product_id', 'product_name', 'sku', 'qty_sold', 'unit_price', 'total_price', 'commission', 'payable', 'remaining_stock'],
            ],
        ]);

    expect($response->json('total_sold'))->toBe($price * 3)
        ->and($response->json('overlapping'))->toBeFalse()
        ->and($response->json('items.0.qty_sold'))->toEqual(3.0)
        ->and($response->json('items.0.remaining_stock'))->toEqual(17.0);
});

it('allows viewing consignment settlement details on show page', function () {
    $fixture = posFixture(stockQty: 0);
    $supplier = Supplier::create([
        'code' => 'SUP-SHOW-1',
        'name' => 'Supplier Show Test',
        'phone' => '08123456780',
        'is_consignor' => true,
        'is_active' => true,
    ]);

    app(StockService::class)->addLayer(
        $fixture['product'],
        $fixture['outlet'],
        10,
        1000,
        isConsignment: true,
        supplierId: $supplier->id,
    );

    $settlement = app(ConsignmentService::class)->settle(
        $supplier,
        $fixture['outlet'],
        now()->subDays(7),
        now(),
        20,
    );

    $response = $this->actingAs($fixture['user'])
        ->get(route('admin.consignment.show', $settlement->id));

    $response->assertOk();
});

it('allows marking settlement as paid with a chosen cash account', function () {
    $fixture = posFixture(stockQty: 0);
    $unit = Unit::find($fixture['product']->base_unit_id);
    $supplier = Supplier::create([
        'code' => 'SUP-PAY-1',
        'name' => 'Supplier Pay Test',
        'phone' => '08123456781',
        'is_consignor' => true,
        'is_active' => true,
    ]);

    app(StockService::class)->addLayer(
        $fixture['product'],
        $fixture['outlet'],
        10,
        1000,
        isConsignment: true,
        supplierId: $supplier->id,
    );

    $price = activeBasePrice($fixture['product'], $fixture['outlet']);

    app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'idempotency_key' => 'test-pay-'.uniqid(),
        'items' => [
            ['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 2],
        ],
        'payments' => [
            ['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => $price * 2],
        ],
    ]);

    $settlement = app(ConsignmentService::class)->settle(
        $supplier,
        $fixture['outlet'],
        now()->subDays(7),
        now(),
        20,
    );

    app(ConsignmentService::class)->approve($settlement, $fixture['user']);

    // Create a specific bank/brankas cash account
    $specificCashAccount = CashAccount::create([
        'outlet_id' => $fixture['outlet']->id,
        'code' => 'KAS-BANK-1',
        'name' => 'Rekening Bank BSI',
        'type' => 'bank',
        'current_balance' => 10000000,
        'is_active' => true,
        'is_default' => false,
    ]);

    $balanceBefore = $specificCashAccount->current_balance;

    $response = $this->actingAs($fixture['user'])
        ->put(route('admin.consignment.mark-paid', $settlement->id), [
            'cash_account_id' => $specificCashAccount->id,
        ]);

    $response->assertRedirect();
    $settlement->refresh();

    expect($settlement->status)->toBe('paid')
        ->and($settlement->cash_account_id)->toBe($specificCashAccount->id)
        ->and($specificCashAccount->fresh()->current_balance)->toBe($balanceBefore - $settlement->payable_amount);
});

it('allows returning unsold consignment stock to the supplier', function () {
    $fixture = posFixture(stockQty: 0);
    $supplier = Supplier::create([
        'code' => 'SUP-RET-1',
        'name' => 'Supplier Retur Test',
        'phone' => '08123456782',
        'is_consignor' => true,
        'is_active' => true,
    ]);

    $layer = app(StockService::class)->addLayer(
        $fixture['product'],
        $fixture['outlet'],
        25,
        1000,
        isConsignment: true,
        supplierId: $supplier->id,
    );

    $response = $this->actingAs($fixture['user'])
        ->post(route('admin.consignment.return'), [
            'stock_layer_id' => $layer->id,
            'qty' => 5,
            'reason' => 'Mendekati kedaluwarsa',
        ]);

    $response->assertRedirect();
    $layer->refresh();

    expect((float) $layer->qty_remaining)->toEqual(20.0);
});
