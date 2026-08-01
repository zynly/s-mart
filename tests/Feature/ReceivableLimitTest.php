<?php

use App\Exceptions\CreditLimitExceededException;
use App\Models\Member;
use App\Models\PaymentMethod;
use App\Models\Unit;
use App\Services\SaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * T-105 — CreditHandler::checkLimit() (ADR-0005). Limit dicek terhadap
 * TOTAL piutang aktif (unpaid/partial/overdue) + nominal baru, BUKAN
 * cuma nominal transaksi ini sendiri. Approver (PIN supervisor) bisa
 * melewati batas — tanpa approver, DomainException/CreditLimitExceededException.
 */
it('rejects a credit sale that would push active receivables past the member limit', function () {
    $fixture = posFixture();
    $unit = Unit::find($fixture['product']->base_unit_id);
    $creditMethod = PaymentMethod::where('type', 'credit')->firstOrFail();

    $member = Member::first();
    $member->update(['receivable_limit' => 10000]);

    $price = activeBasePrice($fixture['product'], $fixture['outlet']);
    // qty dipilih supaya grand_total pasti > receivable_limit (10.000).
    $qty = (int) ceil(20000 / max(1, $price)) + 1;

    expect(fn () => app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'member_id' => $member->id,
        'idempotency_key' => 'test-credit-over-limit-'.uniqid(),
        'items' => [
            ['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => $qty],
        ],
        'payments' => [
            ['payment_method_id' => $creditMethod->id, 'amount' => $price * $qty],
        ],
    ]))->toThrow(CreditLimitExceededException::class);
});

it('allows a credit sale within the member limit and records it as a receivable', function () {
    $fixture = posFixture();
    $unit = Unit::find($fixture['product']->base_unit_id);
    $creditMethod = PaymentMethod::where('type', 'credit')->firstOrFail();

    $price = activeBasePrice($fixture['product'], $fixture['outlet']);
    $member = Member::first();
    $member->update(['receivable_limit' => $price * 10]);

    $sale = app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'member_id' => $member->id,
        'idempotency_key' => 'test-credit-within-limit-'.uniqid(),
        'items' => [
            ['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 2],
        ],
        'payments' => [
            ['payment_method_id' => $creditMethod->id, 'amount' => $price * 2],
        ],
    ]);

    expect($sale->status)->toBe('completed');
    $this->assertDatabaseHas('receivables', [
        'member_id' => $member->id,
        'sale_id' => $sale->id,
        'total_amount' => $price * 2,
        'status' => 'unpaid',
    ]);
});
