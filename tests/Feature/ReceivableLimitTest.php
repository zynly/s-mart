<?php

use App\Exceptions\CreditLimitExceededException;
use App\Models\Member;
use App\Models\PaymentMethod;
use App\Models\Unit;
use App\Models\User;
use App\Services\AuthorizationService;
use App\Services\SaleService;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

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
    $member->update(['receivable_limit' => 10000, 'type' => 'fasilitator']);

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
    $member->update(['receivable_limit' => $price * 10, 'type' => 'fasilitator']);

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

it('strictly forbids credit for santri members', function () {
    $fixture = posFixture();
    $unit = Unit::find($fixture['product']->base_unit_id);
    $creditMethod = PaymentMethod::where('type', 'credit')->firstOrFail();

    $price = activeBasePrice($fixture['product'], $fixture['outlet']);
    $member = Member::first();
    $member->update(['type' => 'santri', 'receivable_limit' => 100000]);

    expect(fn () => app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'member_id' => $member->id,
        'idempotency_key' => 'test-credit-santri-'.uniqid(),
        'items' => [
            ['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 1],
        ],
        'payments' => [
            ['payment_method_id' => $creditMethod->id, 'amount' => $price],
        ],
    ]))->toThrow(\DomainException::class, 'Anggota santri tidak diizinkan menggunakan metode pembayaran Kredit/Tempo.');
});

it('allows an over-limit credit sale ONLY with a valid receivable.approve token, not with a forged one', function () {
    $fixture = posFixture();
    $unit = Unit::find($fixture['product']->base_unit_id);
    $creditMethod = PaymentMethod::where('type', 'credit')->firstOrFail();

    $member = Member::first();
    $member->update(['receivable_limit' => 10000, 'type' => 'fasilitator']);

    $price = activeBasePrice($fixture['product'], $fixture['outlet']);
    $qty = (int) ceil(20000 / max(1, $price)) + 1;

    $cart = fn (string $token) => [
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'member_id' => $member->id,
        'idempotency_key' => 'test-credit-token-'.uniqid(),
        'items' => [['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => $qty]],
        'payments' => [[
            'payment_method_id' => $creditMethod->id,
            'amount' => $price * $qty,
            'credit_approval_token' => $token,
        ]],
    ];

    // Token palsu — HARUS tetap ditolak, bukan lolos begitu saja.
    expect(fn () => app(SaleService::class)->complete($cart('forged-token')))
        ->toThrow(CreditLimitExceededException::class);

    // Token sah (treasurer memegang receivable.approve) — HARUS lolos.
    $treasurer = User::role('treasurer')->firstOrFail();
    $token = app(AuthorizationService::class)->issueToken($treasurer, 'receivable.approve');

    $sale = app(SaleService::class)->complete($cart($token));

    expect($sale->status)->toBe('completed');
});
