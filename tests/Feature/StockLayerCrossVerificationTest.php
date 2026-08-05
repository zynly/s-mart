<?php

use App\Models\Outlet;
use App\Models\Product;
use App\Models\StockLayer;
use App\Services\StockAdjustmentService;
use App\Services\StockService;
use App\Services\WriteOffService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Audit independen (2026-08-02), Fase 6 — Temuan Tinggi: stock_layer_id
 * pada write-off & stock adjustment sebelumnya tidak pernah diverifikasi
 * cocok dengan outlet/produk header dokumennya — layer produk/outlet
 * LAIN bisa dipakai (kebocoran isolasi multi-outlet).
 */
it('rejects a write-off whose chosen stock_layer_id belongs to a different product/outlet', function () {
    $fixture = posFixture();
    $otherOutlet = Outlet::create(['code' => 'OUT-WO', 'name' => 'Outlet Lain WO', 'is_active' => true]);
    $otherProduct = Product::where('is_active', true)->where('id', '!=', $fixture['product']->id)->first();

    $foreignLayer = app(StockService::class)->addLayer($otherProduct, $otherOutlet, 20, 1000);

    expect(fn () => app(WriteOffService::class)->request([
        'outlet_id' => $fixture['outlet']->id,
        'product_id' => $fixture['product']->id,
        'stock_layer_id' => $foreignLayer->id,
        'qty' => 5,
        'type' => 'damaged',
        'reason' => 'uji layer lintas outlet/produk',
    ], $fixture['admin']))->toThrow(DomainException::class);
});

it('rejects a stock adjustment decrease whose chosen stock_layer_id belongs to a different product/outlet', function () {
    $fixture = posFixture();
    $otherOutlet = Outlet::create(['code' => 'OUT-ADJ', 'name' => 'Outlet Lain ADJ', 'is_active' => true]);
    $otherProduct = Product::where('is_active', true)->where('id', '!=', $fixture['product']->id)->first();

    $foreignLayer = app(StockService::class)->addLayer($otherProduct, $otherOutlet, 20, 1000);

    expect(fn () => app(StockAdjustmentService::class)->request([
        'outlet_id' => $fixture['outlet']->id,
        'type' => 'decrease',
        'reason' => 'uji layer lintas outlet/produk',
        'items' => [
            ['product_id' => $fixture['product']->id, 'qty' => 3, 'stock_layer_id' => $foreignLayer->id],
        ],
    ], $fixture['admin']))->toThrow(DomainException::class);
});

it('correctly reduces stock when a write-off uses a valid, matching stock_layer_id (regression sanity)', function () {
    $fixture = posFixture(stockQty: 30);
    $layer = StockLayer::where('product_id', $fixture['product']->id)->where('outlet_id', $fixture['outlet']->id)->latest('id')->first();

    $before = app(StockService::class)->getAvailable($fixture['product'], $fixture['outlet']);

    $writeOffService = app(WriteOffService::class);
    $writeOff = $writeOffService->request([
        'outlet_id' => $fixture['outlet']->id,
        'product_id' => $fixture['product']->id,
        'stock_layer_id' => $layer->id,
        'qty' => 4,
        'type' => 'damaged',
        'reason' => 'uji write-off valid',
    ], $fixture['admin']);

    $writeOffService->approve($writeOff, $fixture['admin']);
    $writeOffService->process($writeOff);

    $after = app(StockService::class)->getAvailable($fixture['product'], $fixture['outlet']);
    expect($after)->toBe($before - 4.0);
});
