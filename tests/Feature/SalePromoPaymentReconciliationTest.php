<?php

use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\Promo;
use App\Services\SaleService;
use App\Services\StockService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Database\Seeders\AccountSeeder;

uses(DatabaseTransactions::class);

it('auto reconciles single payment when promo discount applies on backend', function () {
    test()->seed(AccountSeeder::class);

    $fixture = posFixture();

    $newProduct = Product::create([
        'name' => 'Unique Recon Product '.uniqid(),
        'sku' => 'SKU-RECON-'.uniqid(),
        'base_unit_id' => $fixture['product']->base_unit_id,
        'is_active' => true,
    ]);

    $price = 10000;
    ProductPrice::create([
        'product_id' => $newProduct->id,
        'outlet_id' => $fixture['outlet']->id,
        'unit_id' => $newProduct->base_unit_id,
        'price' => $price,
        'effective_from' => now()->subDay(),
        'created_by' => $fixture['admin']->id,
    ]);

    app(StockService::class)->addLayer($newProduct, $fixture['outlet'], 50, 5000);

    // Create a 20% discount promo exclusively for this new product
    $promo = Promo::create([
        'code' => 'PROMO-TEST-'.uniqid(),
        'name' => 'Test 20% Discount',
        'type' => 'product',
        'scope' => 'item',
        'discount_type' => 'percent',
        'discount_value' => 20,
        'start_date' => now()->subDay()->toDateString(),
        'end_date' => now()->addDays(7)->toDateString(),
        'is_active' => true,
        'is_public' => true,
        'created_by' => $fixture['admin']->id,
    ]);
    $promo->products()->attach($newProduct->id);

    $qty = 2;
    $subtotal = $price * $qty; // 20000
    $expectedDiscount = 4000;  // 20% of 20000
    $expectedGrandTotal = 16000;

    // Frontend sends payment amount = $subtotal (pre-promo total = 20000)
    $saleService = app(SaleService::class);
    $sale = $saleService->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'idempotency_key' => 'idemp-test-recon-'.uniqid(),
        'items' => [
            ['product_id' => $newProduct->id, 'unit_id' => $newProduct->base_unit_id, 'qty' => $qty],
        ],
        'payments' => [
            [
                'payment_method_id' => $fixture['paymentMethod']->id,
                'amount' => $subtotal,
                'received_amount' => $subtotal,
            ],
        ],
    ]);

    expect($sale->grand_total)->toBe($expectedGrandTotal)
        ->and($sale->total_discount)->toBe($expectedDiscount)
        ->and($sale->paid_amount)->toBe($subtotal)
        ->and($sale->change_amount)->toBe($expectedDiscount);
});
