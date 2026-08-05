<?php

use App\Models\StockLayer;
use App\Models\Supplier;
use App\Models\Unit;
use App\Services\ConsignmentService;
use App\Services\PriceService;
use App\Services\SaleService;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Audit independen (2026-08-02), Fase 6 — Temuan Sedang: (a) komisi
 * konsinyasi sebelumnya dihitung dari harga jual AKTIF SEKARANG, bukan
 * harga yang benar-benar berlaku saat barang terjual; (b) tidak ada
 * proteksi periode overlap/duplikat pada settlement.
 */
it('calculates the settlement using the actual sale price recorded on the sale, not the current active price', function () {
    $fixture = posFixture(stockQty: 0);
    $unit = Unit::find($fixture['product']->base_unit_id);
    $supplier = Supplier::create(['code' => 'SUP-SETTLE-1', 'name' => 'Uji Settlement Harga', 'phone' => '0800000010', 'is_active' => true]);

    StockLayer::where('product_id', $fixture['product']->id)->where('outlet_id', $fixture['outlet']->id)->delete();
    app(StockService::class)->addLayer($fixture['product'], $fixture['outlet'], 10, 1000, isConsignment: true, supplierId: $supplier->id);

    $originalPrice = activeBasePrice($fixture['product'], $fixture['outlet']);

    $sale = app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'idempotency_key' => 'test-settle-price-'.uniqid(),
        'items' => [['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 2]],
        'payments' => [['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => $originalPrice * 2]],
    ]);

    // Harga produk NAIK signifikan SETELAH transaksi terjadi.
    $newPrice = $originalPrice + 50000;
    app(PriceService::class)->changePrice($fixture['product'], $fixture['outlet'], $unit, $newPrice, now()->toDateString());

    $calc = app(ConsignmentService::class)->calculateSettlement(
        $supplier, $fixture['outlet'], now()->subDay(), now()->addDay(), 20,
    );

    $expectedTotal = (int) round($originalPrice * 2);

    // Sebelum perbaikan: ini akan pakai $newPrice (harga sekarang),
    // bukan $originalPrice (harga sebenarnya saat nota dibuat).
    expect($calc['total_sold'])->toBe($expectedTotal)
        ->and($calc['total_sold'])->not->toBe((int) round($newPrice * 2));
});

it('rejects a settlement whose period overlaps an existing draft/approved/paid settlement for the same supplier+outlet', function () {
    $fixture = posFixture(stockQty: 0);
    $supplier = Supplier::create(['code' => 'SUP-SETTLE-2', 'name' => 'Uji Settlement Overlap', 'phone' => '0800000011', 'is_active' => true]);

    app(StockService::class)->addLayer($fixture['product'], $fixture['outlet'], 10, 1000, isConsignment: true, supplierId: $supplier->id);

    $consignmentService = app(ConsignmentService::class);
    $consignmentService->settle($supplier, $fixture['outlet'], now()->subDays(30), now(), 20);

    // Periode kedua tumpang tindih (overlap) dengan yang pertama.
    expect(fn () => $consignmentService->settle($supplier, $fixture['outlet'], now()->subDays(5), now()->addDays(5), 20))
        ->toThrow(DomainException::class);
});
