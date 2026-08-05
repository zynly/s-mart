<?php

use App\Models\Product;
use App\Models\Stock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * REVISI-R1-v2.md §4.6/§4.7 — Lapis 1: grid katalog kasir hanya
 * menampilkan produk yang benar-benar punya stok (>0) di outlet yang
 * sedang aktif. Produk tanpa stok di outlet ini (walau aktif & favorit)
 * TIDAK BOLEH muncul di /pos.
 */
it('only lists products that actually have stock at the active outlet in the POS catalog', function () {
    $fixture = posFixture(stockQty: 10);
    $cashier = User::role('cashier')->firstOrFail();

    $noStockProduct = Product::where('is_active', true)->where('id', '!=', $fixture['product']->id)->first();
    // Pastikan produk ini benar-benar tanpa stok di outlet manapun.
    Stock::where('product_id', $noStockProduct->id)->delete();

    $response = $this->actingAs($cashier)->get(route('pos.index'));

    $response->assertInertia(function ($page) use ($fixture, $noStockProduct) {
        $ids = collect($page->toArray()['props']['catalog']['data'])->pluck('id');
        expect($ids)->toContain($fixture['product']->id)
            ->and($ids)->not->toContain($noStockProduct->id);
    });
});

it('excludes a product whose stock at the outlet is exactly zero', function () {
    $fixture = posFixture();
    $cashier = User::role('cashier')->firstOrFail();

    // posFixture() MENAMBAH layer stok di atas stok yang mungkin sudah
    // ada dari seeder — nol-kan eksplisit di sini supaya total benar-benar 0.
    Stock::where('product_id', $fixture['product']->id)
        ->where('outlet_id', $fixture['outlet']->id)
        ->update(['qty' => 0]);

    $response = $this->actingAs($cashier)->get(route('pos.index'));

    $response->assertInertia(function ($page) use ($fixture) {
        $ids = collect($page->toArray()['props']['catalog']['data'])->pluck('id');
        expect($ids)->not->toContain($fixture['product']->id);
    });
});
