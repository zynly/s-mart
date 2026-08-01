<?php

use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\Unit;
use App\Services\SaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * T-105 — VoucherService::revertCoupon() (T-071). Dipanggil VoidService
 * saat sebuah nota dibatalkan: used_count dikembalikan, status kupon
 * dikembalikan ke 'active' KECUALI kupon sudah sengaja dibatalkan admin
 * (status 'cancelled') — void nota lama tidak boleh menghidupkannya
 * lagi (CATATAN-PERBAIKAN.md §Fase 11, VoucherService.php:110-116).
 */
it('reverts used_count and reactivates the coupon when its sale is voided', function () {
    $fixture = posFixture();
    $unit = Unit::find($fixture['product']->base_unit_id);

    $coupon = Coupon::create([
        'code' => 'REVERT1',
        'name' => 'Uji Revert',
        'discount_type' => 'amount',
        'discount_value' => 1000,
        'quota' => 1,
        'used_count' => 0,
        'per_member_limit' => 0,
        'status' => 'active',
        'valid_from' => now()->subDay(),
        'valid_until' => now()->addDay(),
    ]);

    $price = activeBasePrice($fixture['product'], $fixture['outlet']);
    $grandTotal = ($price * 5) - 1000;

    $saleService = app(SaleService::class);
    $sale = $saleService->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'idempotency_key' => 'test-coupon-revert-'.uniqid(),
        'coupon_code' => 'REVERT1',
        'items' => [
            ['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 5],
        ],
        'payments' => [
            ['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => $grandTotal],
        ],
    ]);

    expect($coupon->fresh())
        ->used_count->toBe(1)
        ->status->toBe('used');

    $saleService->void($sale, 'uji revert kupon', $fixture['admin']);

    $redemption = CouponRedemption::where('sale_id', $sale->id)->firstOrFail();

    expect($redemption->is_reverted)->toBeTrue()
        ->and($coupon->fresh())
        ->used_count->toBe(0)
        ->status->toBe('active');
});

it('does not reactivate a coupon that was already manually cancelled', function () {
    $fixture = posFixture();
    $unit = Unit::find($fixture['product']->base_unit_id);

    $coupon = Coupon::create([
        'code' => 'REVERT2',
        'name' => 'Uji Revert Dibatalkan',
        'discount_type' => 'amount',
        'discount_value' => 1000,
        'quota' => 5,
        'used_count' => 0,
        'per_member_limit' => 0,
        'status' => 'active',
        'valid_from' => now()->subDay(),
        'valid_until' => now()->addDay(),
    ]);

    $price = activeBasePrice($fixture['product'], $fixture['outlet']);
    $grandTotal = ($price * 5) - 1000;

    $saleService = app(SaleService::class);
    $sale = $saleService->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'idempotency_key' => 'test-coupon-revert-cancelled-'.uniqid(),
        'coupon_code' => 'REVERT2',
        'items' => [
            ['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 5],
        ],
        'payments' => [
            ['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => $grandTotal],
        ],
    ]);

    // Admin membatalkan kupon secara terpisah (mis. ditemukan salah setting) — SEBELUM nota di-void.
    $coupon->update(['status' => 'cancelled']);

    $saleService->void($sale, 'uji revert kupon dibatalkan', $fixture['admin']);

    expect($coupon->fresh()->status)->toBe('cancelled');
});
