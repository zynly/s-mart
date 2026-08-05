<?php

use App\Models\Coupon;
use App\Models\Unit;
use App\Services\SaleReturnService;
use App\Services\SaleService;
use App\Services\StockService;
use App\Services\VoucherService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Audit independen (2026-08-02), Fase 6 — Temuan Tinggi (void gagal
 * total untuk nota yang pernah diretur sebagian) & Temuan Tinggi
 * (race condition redeem kupon — validate() tanpa lock, redeem() tidak
 * re-verifikasi kuota di bawah lock).
 */
it('successfully voids a sale that was previously partially returned (previously always failed)', function () {
    $fixture = posFixture(stockQty: 100);
    $unit = Unit::find($fixture['product']->base_unit_id);
    $price = activeBasePrice($fixture['product'], $fixture['outlet']);

    $stockBefore = app(StockService::class)->getAvailable($fixture['product'], $fixture['outlet']);

    $sale = app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'idempotency_key' => 'test-void-partial-'.uniqid(),
        'items' => [['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 5]],
        'payments' => [['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => $price * 5]],
    ]);

    $saleItem = $sale->items->first();

    // Retur SEBAGIAN (2 dari 5) — meninggalkan StockLayerConsumption
    // dengan is_returned masih false tapi qty_returned=2.
    app(SaleReturnService::class)->createAndProcess([
        'sale_id' => $sale->id,
        'cashier_session_id' => $fixture['session']->id,
        'reason' => 'other',
        'idempotency_key' => 'return-before-void-'.uniqid(),
        'items' => [['sale_item_id' => $saleItem->id, 'qty' => 2, 'condition' => 'good', 'restock' => true]],
    ], $fixture['admin']);

    // Sebelum perbaikan: void() ini SELALU melempar DomainException
    // ("qty retur melebihi qty konsumsi") untuk nota manapun yang
    // pernah diretur sebagian — fitur void jadi tidak bisa dipakai.
    $voided = app(SaleService::class)->void($sale, 'uji void setelah retur sebagian', $fixture['admin']);

    expect($voided->status)->toBe('void');

    // Stok harus kembali PERSIS ke semula: retur(2) + void(sisa 3) = 5.
    $stockAfter = app(StockService::class)->getAvailable($fixture['product'], $fixture['outlet']);
    expect($stockAfter)->toBe($stockBefore);
});

it('rejects redeem() when the coupon quota is already exhausted at lock time (race guard)', function () {
    $fixture = posFixture();

    $coupon = Coupon::create([
        'code' => 'RACEGUARD',
        'name' => 'Uji Race Guard',
        'discount_type' => 'amount',
        'discount_value' => 1000,
        'quota' => 1,
        'used_count' => 1, // simulasikan sudah dipakai transaksi konkuren lain
        'per_member_limit' => 0,
        'status' => 'used',
        'valid_from' => now()->subDay(),
        'valid_until' => now()->addDay(),
    ]);

    $sale = app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'idempotency_key' => 'test-race-sale-'.uniqid(),
        'items' => [['product_id' => $fixture['product']->id, 'unit_id' => Unit::find($fixture['product']->base_unit_id)->id, 'qty' => 1]],
        'payments' => [['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => activeBasePrice($fixture['product'], $fixture['outlet'])]],
    ]);

    expect(fn () => app(VoucherService::class)->redeem($coupon, $sale, null, 1000))
        ->toThrow(DomainException::class);

    expect($coupon->fresh()->used_count)->toBe(1);
});
