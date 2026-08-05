<?php

use App\Models\Product;
use App\Models\Promo;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\Unit;
use App\Services\SaleReturnService;
use App\Services\SaleService;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Audit independen (2026-08-02), Fase 2 — Temuan Kritis #2:
 * SaleReturnService sebelumnya menghitung nilai retur dari
 * `unit_price * qty` (harga KOTOR) — retur PENUH nota berdiskon SELALU
 * ditolak ("melebihi nominal refundable"), dan retur SEBAGIAN item
 * berpromo mengembalikan lebih banyak uang tunai dari yang sebenarnya
 * dibayar pelanggan. Diperbaiki via SaleReturnService::calculateNetReturnValue()
 * — nilai retur sekarang net dari SEMUA lapis diskon (item/promo per
 * baris + proporsi diskon transaksi/kupon di level nota), dialokasikan
 * largest-remainder supaya SUM selalu persis == grand_total untuk
 * retur penuh, tidak pernah lebih/kurang satu rupiah pun.
 */
function completeSaleWithDiscount(array $fixture, int $qty, int $billDiscount = 0): Sale
{
    $unit = Unit::find($fixture['product']->base_unit_id);
    $price = activeBasePrice($fixture['product'], $fixture['outlet']);
    $grandTotal = ($price * $qty) - $billDiscount;

    return app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'idempotency_key' => 'test-return-net-'.uniqid(),
        'bill_discount' => $billDiscount,
        'items' => [
            ['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => $qty],
        ],
        'payments' => [
            ['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => $grandTotal],
        ],
    ]);
}

it('refunds the exact grand_total (no more, no less) on a full return of a discounted sale', function () {
    $fixture = posFixture();
    // bill_discount besar tapi dalam batas max_discount_percent (50%)
    // supaya tidak butuh approval token di test ini — fokus ke kalkulasi.
    $price = activeBasePrice($fixture['product'], $fixture['outlet']);
    $billDiscount = (int) round($price * 5 * 0.1); // 10%

    $sale = completeSaleWithDiscount($fixture, 5, $billDiscount);
    $saleItem = $sale->items->first();

    $return = app(SaleReturnService::class)->createAndProcess([
        'sale_id' => $sale->id,
        'cashier_session_id' => $fixture['session']->id,
        'reason' => 'other',
        'idempotency_key' => 'return-full-discounted-'.uniqid(),
        'items' => [
            ['sale_item_id' => $saleItem->id, 'qty' => 5, 'condition' => 'good', 'restock' => true],
        ],
    ], $fixture['admin']);

    // Sebelum perbaikan: ini melempar DomainException "melebihi nominal
    // refundable" untuk SETIAP nota berdiskon — sekarang harus SUKSES
    // dan totalnya PERSIS sama dengan grand_total nota.
    expect($return->total)->toBe($sale->grand_total)
        ->and($return->type)->toBe('full');
});

it('refunds only the net (post-item-promo) value on a partial return, not the gross price', function () {
    $fixture = posFixture();

    $promo = Promo::create([
        'code' => 'RETURNPROMO',
        'name' => 'Uji Retur Promo',
        'type' => 'product',
        'scope' => 'item',
        'discount_type' => 'percent',
        'discount_value' => 20, // 20% diskon per unit
        'is_active' => true,
        'is_stackable' => false,
        'priority' => 0,
    ]);

    $unit = Unit::find($fixture['product']->base_unit_id);
    $price = activeBasePrice($fixture['product'], $fixture['outlet']);
    $grossLine = $price * 5;
    $itemDiscount = (int) round($grossLine * 0.2);
    $grandTotal = $grossLine - $itemDiscount;

    $sale = app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'idempotency_key' => 'test-return-promo-'.uniqid(),
        'items' => [
            ['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 5],
        ],
        'payments' => [
            ['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => $grandTotal],
        ],
    ]);

    $saleItem = $sale->items->first();
    expect($saleItem->subtotal)->toBe($grandTotal); // sanity: net sudah di sale_items.subtotal

    // Retur 2 dari 5 unit — nilai net per unit = grandTotal/5.
    $return = app(SaleReturnService::class)->createAndProcess([
        'sale_id' => $sale->id,
        'cashier_session_id' => $fixture['session']->id,
        'reason' => 'other',
        'idempotency_key' => 'return-partial-promo-'.uniqid(),
        'items' => [
            ['sale_item_id' => $saleItem->id, 'qty' => 2, 'condition' => 'good', 'restock' => true],
        ],
    ], $fixture['admin']);

    $expectedNetForTwo = (int) round($grandTotal * (2 / 5));

    // Sebelum perbaikan: ini akan sama dengan unit_price*2 (KOTOR, tanpa
    // potongan 20%) — kelebihan bayar dari laci kasir setiap kejadian.
    expect($return->total)->toBe($expectedNetForTwo)
        ->and($return->total)->not->toBe($price * 2)
        ->and($return->type)->toBe('partial');

    $promo->delete();
});

it('handles repeated partial returns on the same line without exceeding the original value', function () {
    $fixture = posFixture();
    $sale = completeSaleWithDiscount($fixture, 4, 0);
    $saleItem = $sale->items->first();
    $returnService = app(SaleReturnService::class);

    $first = $returnService->createAndProcess([
        'sale_id' => $sale->id,
        'cashier_session_id' => $fixture['session']->id,
        'reason' => 'other',
        'idempotency_key' => 'return-repeat-1-'.uniqid(),
        'items' => [['sale_item_id' => $saleItem->id, 'qty' => 2, 'condition' => 'good', 'restock' => true]],
    ], $fixture['admin']);

    $second = $returnService->createAndProcess([
        'sale_id' => $sale->id,
        'cashier_session_id' => $fixture['session']->id,
        'reason' => 'other',
        'idempotency_key' => 'return-repeat-2-'.uniqid(),
        'items' => [['sale_item_id' => $saleItem->id, 'qty' => 2, 'condition' => 'good', 'restock' => true]],
    ], $fixture['admin']);

    expect($first->total + $second->total)->toBe($sale->grand_total);

    // Retur ketiga (item terakhir sudah habis) — qty tersisa 0, harus ditolak.
    expect(fn () => $returnService->createAndProcess([
        'sale_id' => $sale->id,
        'cashier_session_id' => $fixture['session']->id,
        'reason' => 'other',
        'idempotency_key' => 'return-repeat-3-'.uniqid(),
        'items' => [['sale_item_id' => $saleItem->id, 'qty' => 1, 'condition' => 'good', 'restock' => true]],
    ], $fixture['admin']))->toThrow(DomainException::class);

    expect(SaleReturn::where('sale_id', $sale->id)->count())->toBe(2);
});

it('rejects returning more quantity than was ever sold', function () {
    $fixture = posFixture();
    $sale = completeSaleWithDiscount($fixture, 3, 0);
    $saleItem = $sale->items->first();

    expect(fn () => app(SaleReturnService::class)->createAndProcess([
        'sale_id' => $sale->id,
        'cashier_session_id' => $fixture['session']->id,
        'reason' => 'other',
        'idempotency_key' => 'return-over-qty-'.uniqid(),
        'items' => [['sale_item_id' => $saleItem->id, 'qty' => 99, 'condition' => 'good', 'restock' => true]],
    ], $fixture['admin']))->toThrow(DomainException::class);
});

it('proportions a transaction-level (bill) discount correctly across a partial return of one product among several', function () {
    $fixture = posFixture();
    $unit = Unit::find($fixture['product']->base_unit_id);
    $secondProduct = Product::where('is_active', true)->where('id', '!=', $fixture['product']->id)->first();
    app(StockService::class)->addLayer($secondProduct, $fixture['outlet'], 100, 1000);

    $priceA = activeBasePrice($fixture['product'], $fixture['outlet']);
    $priceB = activeBasePrice($secondProduct, $fixture['outlet']);
    $grossSubtotal = ($priceA * 3) + ($priceB * 2);
    $billDiscount = (int) round($grossSubtotal * 0.15);
    $grandTotal = $grossSubtotal - $billDiscount;

    $sale = app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'idempotency_key' => 'test-return-multi-'.uniqid(),
        'bill_discount' => $billDiscount,
        'items' => [
            ['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 3],
            ['product_id' => $secondProduct->id, 'unit_id' => $unit->id, 'qty' => 2],
        ],
        'payments' => [
            ['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => $grandTotal],
        ],
    ]);

    $itemA = $sale->items->firstWhere('product_id', $fixture['product']->id);

    // Retur SEMUA qty produk A saja — nilainya harus proporsi bill_discount
    // dari subtotal produk A, BUKAN gross priceA*3.
    $return = app(SaleReturnService::class)->createAndProcess([
        'sale_id' => $sale->id,
        'cashier_session_id' => $fixture['session']->id,
        'reason' => 'other',
        'idempotency_key' => 'return-multi-a-'.uniqid(),
        'items' => [['sale_item_id' => $itemA->id, 'qty' => 3, 'condition' => 'good', 'restock' => true]],
    ], $fixture['admin']);

    $sumLineSubtotal = $sale->items->sum('subtotal');
    $expectedShare = (int) round($billDiscount * ($itemA->subtotal / $sumLineSubtotal));
    $expectedValue = $itemA->subtotal - $expectedShare;

    expect($return->total)->toBe($expectedValue)
        ->and($return->total)->toBeLessThan($priceA * 3);
});
