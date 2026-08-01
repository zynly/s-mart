<?php

use App\Models\CashAccount;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Unit;
use App\Models\User;
use App\Services\CashierSessionService;
use App\Services\PriceService;
use App\Services\StockService;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| T-105 (Fase 18): tests/Pest.php TIDAK PERNAH ada sejak Fase 0 meski
| pestphp/pest-plugin-laravel sudah ter-install — tanpa file ini, Pest
| test bergaya fungsional (it(...)/uses(...)) jatuh ke PHPUnit\Framework\
| TestCase polos (bukan Tests\TestCase), aplikasi Laravel tidak pernah
| ter-boot, dan pemanggilan facade apa pun (DB::, dst) langsung melempar
| "A facade root has not been set." Baris ini menyambungkan SEMUA test
| di tests/Feature & tests/Unit ke Tests\TestCase (yang extends Laravel's
| base TestCase, jadi app() ter-boot penuh per test).
|
*/

pest()->extend(TestCase::class)->in('Feature', 'Unit');

/*
|--------------------------------------------------------------------------
| Fixture bersama T-105
|--------------------------------------------------------------------------
|
| Business-rule test (checkout, void, retur, dst) hampir semua butuh
| set fixture yang SAMA (outlet, kasir bersesi, kas, produk berstok,
| metode bayar tunai) — dipusatkan di sini (bukan diulang per file)
| supaya satu perubahan pola seed tidak perlu ditambal di 6 tempat.
| Sengaja lewat SERVICE nyata (StockService::addLayer,
| CashierSessionService::open), bukan insert mentah — supaya fixture
| selalu konsisten dengan invariant yang service jaga (cache stok,
| dst), sama seperti pola yang sudah terbukti dipakai sepanjang sesi
| audit (Phase A/B/C) lewat tinker.
|
| @return array{outlet: Outlet, cashier: User, admin: User, product: Product,
|     cashAccount: CashAccount, paymentMethod: PaymentMethod, session: \App\Models\CashierSession}
*/
function posFixture(int $stockQty = 100, int $unitCost = 1000): array
{
    $outlet = Outlet::first();
    $cashier = User::role('cashier')->first();
    $admin = User::role('admin')->first();
    $cashAccount = CashAccount::where('is_drawer', true)->where('is_active', true)->first();
    $paymentMethod = PaymentMethod::where('type', 'cash')->first();
    $product = Product::where('is_active', true)->first();

    app(StockService::class)->addLayer($product, $outlet, $stockQty, $unitCost);

    test()->actingAs($cashier);
    $session = app(CashierSessionService::class)->open($cashier, $cashAccount, 100000);

    return compact('outlet', 'cashier', 'admin', 'product', 'cashAccount', 'paymentMethod', 'session');
}

/**
 * Harga aktif produk pada satuan dasarnya di outlet fixture — dipakai
 * buat menghitung `payments.*.amount` yang harus PERSIS sama dengan
 * `grand_total` (PaymentService menolak selisih, PaymentMismatchException).
 */
function activeBasePrice(Product $product, Outlet $outlet): int
{
    $unit = Unit::find($product->base_unit_id);

    return app(PriceService::class)->getActivePrice($product, $outlet, $unit, null);
}
