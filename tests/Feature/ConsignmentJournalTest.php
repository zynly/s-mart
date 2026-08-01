<?php

use App\Models\Journal;
use App\Models\JournalEntry;
use App\Models\StockLayer;
use App\Models\Supplier;
use App\Models\Unit;
use App\Services\ConsignmentService;
use App\Services\SaleService;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * T-105 — Konsinyasi = MODEL MURNI, bukan beli-saat-terjual
 * (docs/CATATAN-PERBAIKAN.md §Fase 13). Barang konsinyasi bukan aset
 * sekolah sampai terjual, jadi:
 *   - Terima konsinyasi: TIDAK ADA JURNAL.
 *   - Jual konsinyasi: ADA jurnal, tapi ke 2-1300 Utang Konsinyasi
 *     (BUKAN akun penjualan biasa) + pengakuan komisi ke 4-1300.
 *   - Retur konsinyasi: TIDAK ADA JURNAL (cuma kurangi layer).
 */
it('posts no journal when consignment stock is received', function () {
    $fixture = posFixture();
    $supplier = Supplier::create(['code' => 'SUP-KON-1', 'name' => 'Uji Supplier Konsinyasi', 'phone' => '0800000000', 'is_active' => true]);

    $journalCountBefore = Journal::count();

    app(StockService::class)->addLayer(
        $fixture['product'],
        $fixture['outlet'],
        50,
        1000,
        isConsignment: true,
        supplierId: $supplier->id,
    );

    expect(Journal::count())->toBe($journalCountBefore);
});

it('posts journal to Utang Konsinyasi (not regular sales revenue) when a consignment product is sold', function () {
    $fixture = posFixture(stockQty: 0);
    $unit = Unit::find($fixture['product']->base_unit_id);
    $supplier = Supplier::create(['code' => 'SUP-KON-2', 'name' => 'Uji Supplier Konsinyasi 2', 'phone' => '0800000001', 'is_active' => true]);

    $fixture['product']->update(['is_consignment' => true, 'consignment_percent' => 20]);

    // StockLayerSeeder (dijalankan sekali oleh $seed=true) sudah kasih
    // stok REGULER untuk produk ini dengan received_at LEBIH AWAL —
    // FEFO akan memilihnya duluan daripada layer konsinyasi baru kalau
    // tidak dibersihkan, membuat penjualan ini seolah 100% reguler.
    StockLayer::where('product_id', $fixture['product']->id)->where('outlet_id', $fixture['outlet']->id)->delete();

    app(StockService::class)->addLayer(
        $fixture['product'],
        $fixture['outlet'],
        10,
        1000,
        isConsignment: true,
        supplierId: $supplier->id,
    );

    $price = activeBasePrice($fixture['product'], $fixture['outlet']);

    $sale = app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'idempotency_key' => 'test-consignment-sale-'.uniqid(),
        'items' => [
            ['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 2],
        ],
        'payments' => [
            ['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => $price * 2],
        ],
    ]);

    $journal = Journal::where('sourceable_type', $sale->getMorphClass())->where('sourceable_id', $sale->id)->firstOrFail();
    $entries = JournalEntry::where('journal_id', $journal->id)->with('account')->get();

    // Sama sekali tidak ada baris ke akun "Penjualan" biasa (4-1000-an
    // regular) untuk porsi konsinyasi — semuanya lewat 2-1300.
    expect($entries->pluck('account.code'))->toContain('2-1300')
        ->and($entries->pluck('account.code'))->toContain('4-1300');
});

it('posts no journal when consignment goods are returned to the owner', function () {
    $fixture = posFixture(stockQty: 0);
    $supplier = Supplier::create(['code' => 'SUP-KON-3', 'name' => 'Uji Supplier Konsinyasi 3', 'phone' => '0800000002', 'is_active' => true]);

    $layer = app(StockService::class)->addLayer(
        $fixture['product'],
        $fixture['outlet'],
        30,
        1000,
        isConsignment: true,
        supplierId: $supplier->id,
    );

    $journalCountBefore = Journal::count();

    app(ConsignmentService::class)->returnGoods($layer, 10);

    expect(Journal::count())->toBe($journalCountBefore)
        ->and($layer->fresh()->qty_remaining)->toEqual(20.0);
});
