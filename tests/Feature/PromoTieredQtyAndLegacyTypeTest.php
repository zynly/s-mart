<?php

use App\Models\Promo;
use App\Models\StockLayer;
use App\Models\User;
use App\Services\PromoEngine;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Gap G-01/G-02 (2026-08-03) — verifikasi perbaikan:
 * (a) tipe promo 'member_level'/'birthday' tidak pernah diterapkan
 *     PromoEngine::matchesProduct() — sekarang ditolak backend untuk promo
 *     BARU, tapi promo LAMA bertipe ini tetap bisa disimpan ulang selama
 *     tipenya tidak diubah (StorePromoRequest::rules()).
 * (b) PromoEngine::tieredDiscountAmount() membaca `tiers`, bukan `min_qty`
 *     tunggal — form web sebelumnya tidak pernah mengirim `tiers` sama
 *     sekali untuk tipe tiered_qty (diskon selalu 0). Sekarang wajib
 *     minimal 1 tier, tanpa duplikat Minimal Qty.
 */
function basePromoPayload(array $overrides = []): array
{
    return array_merge([
        'code' => 'TQ-'.uniqid(),
        'name' => 'Uji Promo',
        'type' => 'product',
        'scope' => 'item',
        'discount_type' => 'percent',
        'discount_value' => 10,
        'is_stackable' => false,
        'is_public' => false,
        'is_active' => true,
        'priority' => 0,
    ], $overrides);
}

it('rejects creating a new promo with legacy type member_level', function () {
    $admin = User::role('admin')->firstOrFail();

    $this->actingAs($admin)
        ->post(route('admin.promos.store'), basePromoPayload(['type' => 'member_level']))
        ->assertSessionHasErrors('type');

    expect(Promo::where('type', 'member_level')->count())->toBe(0);
});

it('rejects creating a new promo with legacy type birthday', function () {
    $admin = User::role('admin')->firstOrFail();

    $this->actingAs($admin)
        ->post(route('admin.promos.store'), basePromoPayload(['type' => 'birthday']))
        ->assertSessionHasErrors('type');
});

it('allows saving an existing legacy-type promo unchanged, but rejects switching another promo into a legacy type', function () {
    $admin = User::role('admin')->firstOrFail();

    // Dibuat langsung lewat model (melewati validasi) — mensimulasikan
    // data lama yang sudah ada di database sebelum perbaikan ini.
    $legacy = Promo::create(basePromoPayload(['code' => 'LEGACY1', 'type' => 'member_level']));

    $this->actingAs($admin)
        ->put(route('admin.promos.update', $legacy), [
            ...basePromoPayload(['code' => 'LEGACY1', 'type' => 'member_level', 'name' => 'Nama Diperbarui']),
        ])
        ->assertSessionDoesntHaveErrors('type');

    expect($legacy->fresh()->name)->toBe('Nama Diperbarui');

    $normal = Promo::create(basePromoPayload(['code' => 'NORMAL1', 'type' => 'product']));

    $this->actingAs($admin)
        ->put(route('admin.promos.update', $normal), basePromoPayload(['code' => 'NORMAL1', 'type' => 'birthday']))
        ->assertSessionHasErrors('type');
});

it('rejects a tiered_qty promo with no tiers and with duplicate tier quantities', function () {
    $admin = User::role('admin')->firstOrFail();

    $this->actingAs($admin)
        ->post(route('admin.promos.store'), basePromoPayload(['type' => 'tiered_qty', 'tiers' => []]))
        ->assertSessionHasErrors('tiers');

    $this->actingAs($admin)
        ->post(route('admin.promos.store'), basePromoPayload([
            'type' => 'tiered_qty',
            'tiers' => [
                ['min_qty' => 5, 'discount' => 10],
                ['min_qty' => 5, 'discount' => 20],
            ],
        ]))
        ->assertSessionHasErrors('tiers');
});

it('creates a working tiered_qty promo and PromoEngine applies the highest satisfied tier', function () {
    $admin = User::role('admin')->firstOrFail();
    $fixture = posFixture();

    $this->actingAs($admin)
        ->post(route('admin.promos.store'), basePromoPayload([
            'code' => 'TIERWORK',
            'type' => 'tiered_qty',
            'tiers' => [
                ['min_qty' => 3, 'discount' => 5],
                ['min_qty' => 10, 'discount' => 15],
            ],
        ]))
        ->assertSessionDoesntHaveErrors();

    $promo = Promo::where('code', 'TIERWORK')->firstOrFail();
    expect($promo->tiers)->toHaveCount(2);

    // avg_cost rendah supaya floor HPP (lihat PromoHppFloorTest) tidak
    // ikut memotong angka diskon yang diverifikasi di bawah.
    $product = $fixture['product'];
    $outlet = $fixture['outlet'];
    StockLayer::where('product_id', $product->id)->where('outlet_id', $outlet->id)->delete();
    app(StockService::class)->addLayer($product, $outlet, 100, 100);

    $lineBelowFirstTier = ['key' => '0', 'product' => $product, 'qty' => 2.0, 'unit_price' => 1000, 'subtotal' => 2000];
    $lineMidTier = ['key' => '0', 'product' => $product, 'qty' => 5.0, 'unit_price' => 1000, 'subtotal' => 5000];
    $lineTopTier = ['key' => '0', 'product' => $product, 'qty' => 12.0, 'unit_price' => 1000, 'subtotal' => 12000];

    $engine = app(PromoEngine::class);

    expect($engine->applyToCart([$lineBelowFirstTier], null, now(), $outlet)['items']['0']['discount'])->toBe(0)
        ->and($engine->applyToCart([$lineMidTier], null, now(), $outlet)['items']['0']['discount'])->toBe(250) // 5% dari 5000
        ->and($engine->applyToCart([$lineTopTier], null, now(), $outlet)['items']['0']['discount'])->toBe(1800); // 15% dari 12000
});
