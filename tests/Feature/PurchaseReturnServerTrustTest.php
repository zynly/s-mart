<?php

use App\Models\Debt;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\Unit;
use App\Services\PurchaseService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Audit independen (2026-08-02), Fase 3 — Temuan Kritis #3 & #4:
 * PurchaseService::processReturn() sebelumnya (a) memakai `unit_cost`
 * MENTAH dari client untuk memotong hutang supplier/menambah kas —
 * staf gudang bisa kirim nilai berapa pun; (b) tidak pernah
 * memverifikasi `purchase_item_id` benar-benar milik `purchase_id`
 * yang disubmit — item dari purchase (dan outlet) LAIN bisa dipakai.
 * Diperbaiki: unit_cost SELALU dari `purchaseItem->final_unit_cost`
 * server, purchase_item_id WAJIB di-scope ke purchase yang benar, dan
 * qty retur divalidasi terhadap sisa (qty dibeli - sudah diretur).
 */
function receivePurchase(Outlet $outlet, Product $product, float $qty = 10, int $unitPrice = 1000, string $paymentType = 'credit'): Purchase
{
    $supplier = Supplier::first();
    $unit = Unit::find($product->base_unit_id);

    return app(PurchaseService::class)->receive([
        'supplier_id' => $supplier->id,
        'outlet_id' => $outlet->id,
        'payment_type' => $paymentType,
    ], [
        [
            'product_id' => $product->id,
            'unit_id' => $unit->id,
            'qty' => $qty,
            'unit_price' => $unitPrice,
            'expired_at' => now()->addYear()->toDateString(),
        ],
    ]);
}

it('derives the return value from final_unit_cost server-side, ignoring a forged unit_cost from the client', function () {
    $fixture = posFixture();
    $purchase = receivePurchase($fixture['outlet'], $fixture['product'], qty: 10, unitPrice: 1000, paymentType: 'credit');
    $purchaseItem = $purchase->items->first();
    $realCost = $purchaseItem->final_unit_cost;

    $return = app(PurchaseService::class)->processReturn([
        'purchase_id' => $purchase->id,
        'reason' => 'rusak',
    ], [
        // Skenario eksploitasi persis dari laporan audit: unit_cost palsu
        // dikirim jauh di atas nilai asli. Tipe array tidak lagi
        // mendeklarasikan field ini, tapi service HARUS mengabaikannya
        // sepenuhnya kalau tetap muncul di payload mentah (Postman/DevTools).
        ['purchase_item_id' => $purchaseItem->id, 'qty' => 2, 'unit_cost' => 5000000],
    ]);

    $expectedTotal = (int) round(2 * $realCost);

    expect($return->total)->toBe($expectedTotal)
        ->and($return->total)->toBeLessThan(5000000);

    $debt = Debt::where('purchase_id', $purchase->id)->first();
    expect($debt->remaining_amount)->toBe($purchase->total - $expectedTotal);
});

it('rejects a purchase_item_id that belongs to a different purchase (cross-purchase/outlet manipulation)', function () {
    $fixture = posFixture();
    $purchaseA = receivePurchase($fixture['outlet'], $fixture['product'], qty: 10);

    $otherOutlet = Outlet::where('id', '!=', $fixture['outlet']->id)->first() ?? Outlet::create([
        'code' => 'OUT2', 'name' => 'Outlet Kedua', 'is_active' => true,
    ]);
    $otherProduct = Product::where('is_active', true)->where('id', '!=', $fixture['product']->id)->first();
    $purchaseB = receivePurchase($otherOutlet, $otherProduct, qty: 10);
    $itemFromB = $purchaseB->items->first();

    expect(fn () => app(PurchaseService::class)->processReturn([
        'purchase_id' => $purchaseA->id,
        'reason' => 'uji purchase_item_id lintas pembelian',
    ], [
        ['purchase_item_id' => $itemFromB->id, 'qty' => 1],
    ]))->toThrow(DomainException::class);
});

it('rejects returning more quantity than was purchased', function () {
    $fixture = posFixture();
    $purchase = receivePurchase($fixture['outlet'], $fixture['product'], qty: 5);
    $purchaseItem = $purchase->items->first();

    expect(fn () => app(PurchaseService::class)->processReturn([
        'purchase_id' => $purchase->id,
        'reason' => 'uji qty berlebih',
    ], [
        ['purchase_item_id' => $purchaseItem->id, 'qty' => 99],
    ]))->toThrow(DomainException::class);
});

it('accounts for previously returned quantity across repeated partial returns', function () {
    $fixture = posFixture();
    $purchase = receivePurchase($fixture['outlet'], $fixture['product'], qty: 10);
    $purchaseItem = $purchase->items->first();

    app(PurchaseService::class)->processReturn([
        'purchase_id' => $purchase->id,
        'reason' => 'retur pertama',
    ], [
        ['purchase_item_id' => $purchaseItem->id, 'qty' => 6],
    ]);

    // 6 sudah diretur, sisa 4 — minta 5 lagi harus ditolak.
    expect(fn () => app(PurchaseService::class)->processReturn([
        'purchase_id' => $purchase->id,
        'reason' => 'retur kedua (melebihi sisa)',
    ], [
        ['purchase_item_id' => $purchaseItem->id, 'qty' => 5],
    ]))->toThrow(DomainException::class);

    // Tepat sisa (4) harus berhasil.
    $second = app(PurchaseService::class)->processReturn([
        'purchase_id' => $purchase->id,
        'reason' => 'retur kedua (pas sisa)',
    ], [
        ['purchase_item_id' => $purchaseItem->id, 'qty' => 4],
    ]);

    expect($second->total)->toBe((int) round(4 * $purchaseItem->final_unit_cost));
});
