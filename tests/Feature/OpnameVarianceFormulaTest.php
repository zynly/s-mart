<?php

use App\Models\Unit;
use App\Services\OpnameService;
use App\Services\SaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Audit independen (2026-08-02), Fase 6 — Temuan Sedang: varians yang
 * dihitung & ditampilkan ke owner saat review (finishCounting())
 * sebelumnya memakai formula BEDA dari yang benar-benar diposting ke
 * stok (post()) — owner menyetujui angka yang bukan angka sungguhan.
 */
it('computes the same movement-adjusted variance at review time as post() will actually apply', function () {
    $fixture = posFixture(stockQty: 20);
    $unit = Unit::find($fixture['product']->base_unit_id);
    $price = activeBasePrice($fixture['product'], $fixture['outlet']);

    $opnameService = app(OpnameService::class);
    $opname = $opnameService->start([
        'outlet_id' => $fixture['outlet']->id,
        'scope' => 'product',
        'scope_ids' => [$fixture['product']->id],
    ], $fixture['admin']);

    // posFixture(stockQty: 20) MENAMBAH layer 20 di atas stok yang
    // sudah ada dari seeder (bukan mengganti) — pakai system_qty riil
    // yang dibekukan opname, bukan asumsi angka mutlak.
    $item = $opname->items()->firstOrFail();
    $systemQty = (float) $item->system_qty;

    // Query movement-since-cutoff (sama di finishCounting() & post())
    // pakai created_at > cutoff_at — majukan waktu 1 detik supaya
    // timestamp penjualan di bawah PASTI lebih besar dari cutoff_at,
    // bukan cuma soal urutan eksekusi dalam detik yang sama.
    $this->travel(1)->second();

    // Penjualan SAH terjadi DI TENGAH counting (setelah cutoff_at) —
    // 3 unit keluar lewat transaksi nyata, bukan hilang/selisih.
    app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'idempotency_key' => 'test-opname-sale-during-count-'.uniqid(),
        'items' => [['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 3]],
        'payments' => [['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => $price * 3]],
    ]);

    // Petugas menghitung fisik SETELAH penjualan itu — realistis
    // systemQty-3, bukan berarti ada barang hilang.
    $opnameService->recordCount($opname, $fixture['product'], $systemQty - 3, $fixture['admin']);
    $reviewed = $opnameService->finishCounting($opname, $fixture['admin']);

    // Sebelum perbaikan: variance_qty = 17 - 20 = -3 (seolah ada
    // penyusutan/kehilangan 3 unit, padahal itu penjualan sah).
    // Setelah perbaikan: variance_qty = 17 - (20 + (-3)) = 0 (tidak ada
    // selisih riil) — PERSIS formula yang dipakai post().
    $reviewedItem = $reviewed->items()->firstOrFail();
    expect((float) $reviewedItem->variance_qty)->toBe(0.0)
        ->and((float) $reviewed->total_variance_qty)->toBe(0.0);
});
