<?php

use App\Models\DepositTransaction;
use App\Models\Member;
use App\Models\PaymentMethod;
use App\Models\Unit;
use App\Services\DepositService;
use App\Services\SaleReturnService;
use App\Services\SaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * T-105 — PaymentService::refundPartial() (T-069, dipakai
 * SaleReturnService, BEDA dari refund() versi void). Retur non-tunai
 * TIDAK menyentuh counter kas sesi kasir sama sekali (beda dari retur
 * tunai) — nilainya kembali ke ledger masing-masing metode (deposit,
 * poin, piutang) yang tidak terikat sesi kasir.
 */
it('refunds a deposit-paid sale back to the member balance on full return', function () {
    $fixture = posFixture();
    $unit = Unit::find($fixture['product']->base_unit_id);
    $depositMethod = PaymentMethod::where('type', 'deposit')->firstOrFail();

    $member = Member::first();
    app(DepositService::class)->bonus($member, 100000, 'saldo awal uji retur', 'test-bonus-'.uniqid());
    $balanceBeforeSale = $member->fresh()->balance_cache;

    $price = activeBasePrice($fixture['product'], $fixture['outlet']);

    $sale = app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'member_id' => $member->id,
        'idempotency_key' => 'test-noncash-return-sale-'.uniqid(),
        'items' => [
            ['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 3],
        ],
        'payments' => [
            ['payment_method_id' => $depositMethod->id, 'amount' => $price * 3],
        ],
    ]);

    expect($member->fresh()->balance_cache)->toBe($balanceBeforeSale - ($price * 3));

    $saleItem = $sale->items->first();
    $saleReturn = app(SaleReturnService::class)->createAndProcess([
        'sale_id' => $sale->id,
        'cashier_session_id' => $fixture['session']->id,
        'reason' => 'customer_request',
        'reason_detail' => 'uji retur non-tunai',
        'idempotency_key' => 'test-noncash-return-'.uniqid(),
        'items' => [
            ['sale_item_id' => $saleItem->id, 'qty' => 3, 'condition' => 'good', 'restock' => true],
        ],
    ]);

    expect($saleReturn->status)->toBe('completed')
        ->and($member->fresh()->balance_cache)->toBe($balanceBeforeSale);

    $refundTxn = DepositTransaction::where('member_id', $member->id)
        ->where('type', 'refund')
        ->latest('id')
        ->first();

    expect($refundTxn)->not->toBeNull()
        ->and($refundTxn->amount)->toBe($price * 3);
});
