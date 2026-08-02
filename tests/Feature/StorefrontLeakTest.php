<?php

use App\Models\Product;

/**
 * T-111 (Fase 19). Spec storefront sendiri eksplisit meminta test ini
 * ("CATATAN UNTUK ZIYAD" di docs/fase-19-storefront-publik.md) — bukan
 * opsional. Storefront pakai database yang SAMA dengan POS; satu
 * kesalahan controller bisa mengirim HPP/stok/SKU ke publik.
 */
it('tidak membocorkan data internal produk lewat halaman detail publik', function () {
    $product = Product::where('is_active', true)->first();
    $product->forceFill(['is_visible_public' => true])->save();

    $response = $this->get("/produk/{$product->slug}");
    // Sengaja HANYA props 'product' (bukan seluruh page object) — page
    // object penuh berisi prop 'ziggy' (daftar SEMUA nama route
    // termasuk "admin.suppliers.index" dst, ini normal & bukan
    // kebocoran data) yang akan membuat assert "not->toContain('supplier')"
    // salah-positif kalau dicek dari seluruh halaman.
    $productJson = json_encode($response->viewData('page')['props']['product'] ?? []);

    expect($response->status())->toBe(200)
        ->and($productJson)
        ->not->toContain('unit_cost')
        ->not->toContain('avg_cost')
        ->not->toContain('hpp')
        ->not->toContain('margin')
        ->not->toContain('supplier')
        ->not->toContain('batch_no')
        ->not->toContain('"sku"')
        ->not->toContain($product->sku);
});

it('tidak membocorkan data internal produk lewat katalog publik', function () {
    $product = Product::where('is_active', true)->first();
    $product->forceFill(['is_visible_public' => true])->save();

    $response = $this->get('/produk');
    $productsJson = json_encode($response->viewData('page')['props']['products'] ?? []);

    expect($response->status())->toBe(200)
        ->and($productsJson)
        ->not->toContain('unit_cost')
        ->not->toContain('avg_cost')
        ->not->toContain('supplier_id')
        ->not->toContain('batch_no')
        ->not->toContain('"sku"');
});

it('produk dengan is_visible_public=false balas 404 di halaman detail', function () {
    $product = Product::where('is_active', true)->first();
    $product->forceFill(['is_visible_public' => false])->save();

    $this->get("/produk/{$product->slug}")->assertNotFound();
});

it('produk dengan is_visible_public=false tidak muncul di katalog', function () {
    $hidden = Product::where('is_active', true)->first();
    $hidden->forceFill(['is_visible_public' => false, 'name' => 'Produk Rahasia Tidak Publik'])->save();

    $json = json_encode($this->get('/produk')->viewData('page') ?? []);

    expect($json)->not->toContain('Produk Rahasia Tidak Publik');
});

it('produk dengan is_active=false balas 404 di halaman detail', function () {
    $product = Product::where('is_active', true)->first();
    $product->forceFill(['is_visible_public' => true, 'is_active' => false])->save();

    $this->get("/produk/{$product->slug}")->assertNotFound();
});
