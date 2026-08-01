<?php

use App\Models\Outlet;
use App\Models\Product;
use App\Models\Promo;
use App\Models\StockLayer;
use App\Services\PromoEngine;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * T-105 — PromoEngine::hppFloor()/applyToLine() (`app/Services/PromoEngine.php`
 * :29-32, 91-92). Diskon (per item, tahap 1+2) tidak boleh menembus
 * estimasi HPP (`stocks.avg_cost * qty`) — dipotong ke sisa ruang yang
 * ada, bukan ditolak; muncul warning "dipotong karena mendekati HPP".
 */
it('caps a promo discount at the estimated HPP floor and warns about it', function () {
    $outlet = Outlet::first();
    $product = Product::where('is_active', true)->first();

    // StockLayerSeeder sudah kasih stok awal produk ini dengan avg_cost
    // sendiri — dibersihkan dulu supaya avg_cost di test ini PERSIS
    // 3000 (satu layer, tidak ada campuran biaya rata-rata tertimbang).
    StockLayer::where('product_id', $product->id)->where('outlet_id', $outlet->id)->delete();
    app(StockService::class)->addLayer($product, $outlet, 10, 3000);

    $promo = Promo::create([
        'code' => 'HPPFLOOR',
        'name' => 'Uji Floor HPP',
        'type' => 'product',
        'scope' => 'item',
        'discount_type' => 'percent',
        'discount_value' => 90, // 90% dari subtotal 5000 = 4500 — jauh di atas floor
        'is_active' => true,
        'is_stackable' => false,
        'priority' => 0,
    ]);

    $line = [
        'key' => '0',
        'product' => $product,
        'qty' => 1.0,
        'unit_price' => 5000,
        'subtotal' => 5000,
    ];

    $result = app(PromoEngine::class)->applyToCart([$line], null, now(), $outlet);
    $itemResult = $result['items']['0'];

    // floor = avg_cost(3000) * qty(1) = 3000; maxDiscount = 5000-3000 = 2000.
    // Diskon mentah 90% = 4500, HARUS dipotong ke 2000, bukan 4500.
    expect($itemResult['discount'])->toBe(2000)
        ->and($result['warnings'])->not->toBeEmpty()
        ->and($result['warnings'][0])->toContain('mendekati HPP');

    $promo->delete();
});
