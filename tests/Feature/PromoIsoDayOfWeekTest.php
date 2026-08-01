<?php

use App\Models\Outlet;
use App\Models\Product;
use App\Models\Promo;
use App\Models\StockLayer;
use App\Services\PromoEngine;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

/**
 * T-105 — PromoEngine::matchesTime() (`app/Services/PromoEngine.php:254`):
 * `$promo->days_of_week` disimpan & dibandingkan pakai `dayOfWeekIso`
 * (ISO-8601: Senin=1 ... Minggu=7) — BUKAN `dayOfWeek` bawaan Carbon
 * (Minggu=0 ... Sabtu=6). Kalau salah satu sisi (data tersimpan vs
 * perbandingan) pakai konvensi yang beda, promo "hari tertentu" bisa
 * aktif/nonaktif di hari yang salah tanpa error apa pun yang terlihat.
 */
it('activates a days-of-week promo only on the configured ISO weekdays', function () {
    $outlet = Outlet::first();
    $product = Product::where('is_active', true)->first();

    // avg_cost rendah & terkontrol supaya floor HPP tidak ikut memotong
    // diskon 500 di test ini (fokus murni ke aturan hari, bukan HPP).
    StockLayer::where('product_id', $product->id)->where('outlet_id', $outlet->id)->delete();
    app(StockService::class)->addLayer($product, $outlet, 10, 100);

    // ISO 1-5 = Senin..Jumat.
    $promo = Promo::create([
        'code' => 'WEEKDAYONLY',
        'name' => 'Uji Hari Kerja',
        'type' => 'product',
        'scope' => 'item',
        'discount_type' => 'amount',
        'discount_value' => 500,
        'days_of_week' => [1, 2, 3, 4, 5],
        'is_active' => true,
        'is_stackable' => false,
        'priority' => 0,
    ]);

    $line = ['key' => '0', 'product' => $product, 'qty' => 1.0, 'unit_price' => 5000, 'subtotal' => 5000];

    $wednesday = Carbon::now()->startOfWeek()->addDays(2)->setTime(10, 0);
    $sunday = Carbon::now()->startOfWeek()->addDays(6)->setTime(10, 0);

    expect($wednesday->dayOfWeekIso)->toBe(3)
        ->and($sunday->dayOfWeekIso)->toBe(7);

    $onWeekday = app(PromoEngine::class)->applyToCart([$line], null, $wednesday, $outlet);
    $onWeekend = app(PromoEngine::class)->applyToCart([$line], null, $sunday, $outlet);

    expect($onWeekday['items']['0']['discount'])->toBe(500)
        ->and($onWeekend['items']['0']['discount'])->toBe(0);

    $promo->delete();
});
