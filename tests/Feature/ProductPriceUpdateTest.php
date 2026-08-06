<?php

use App\Models\Category;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Gap ditemukan (user melaporkan "kenapa tidak ada menu mengubah
 * harga"): PriceService::changePrice() sudah ada & teruji lewat alur
 * BUAT produk, tapi tidak ada satu pun jalur untuk UBAH harga produk
 * yang sudah ada — ditambal via ProductController::updatePrice() baru
 * (admin.products.update-price). product_prices immutable: "ubah"
 * berarti baris lama ditutup (effective_to) + baris baru dibuat,
 * BUKAN update kolom price langsung.
 */
function productWithPrice(): array
{
    $category = Category::create(['code' => 'CAT-PRC-'.random_int(10000, 99999), 'name' => 'Kategori Uji Harga', 'is_active' => true]);
    $unit = Unit::create(['code' => 'PCS-'.random_int(10000, 99999), 'name' => 'Pcs', 'is_active' => true]);
    $outlet = Outlet::where('is_main', true)->first() ?? Outlet::create(['code' => 'OUT-PRC', 'name' => 'Outlet Uji', 'is_main' => true, 'is_active' => true]);

    $product = Product::create([
        'sku' => 'PRC-'.random_int(10000, 99999),
        'name' => 'Produk Uji Harga',
        'category_id' => $category->id,
        'base_unit_id' => $unit->id,
        'is_active' => true,
    ]);

    $oldPrice = ProductPrice::create([
        'product_id' => $product->id,
        'outlet_id' => $outlet->id,
        'unit_id' => $unit->id,
        'price' => 10000,
        'effective_from' => now()->subMonth()->toDateString(),
        'created_by' => User::role('admin')->firstOrFail()->id,
    ]);

    return [$product, $outlet, $unit, $oldPrice];
}

it('closes the old price row and creates a new one when an admin changes a product price', function () {
    [$product, $outlet, $unit, $oldPrice] = productWithPrice();
    $admin = User::role('admin')->firstOrFail();

    $this->actingAs($admin)
        ->post(route('admin.products.update-price', $product), [
            'outlet_id' => $outlet->id,
            'unit_id' => $unit->id,
            'price' => 15000,
            'member_price' => 12000,
            'effective_from' => now()->toDateString(),
        ])
        ->assertSessionDoesntHaveErrors();

    expect($oldPrice->fresh()->effective_to)->not->toBeNull();

    $newPrice = ProductPrice::where('product_id', $product->id)->whereNull('effective_to')->first();
    expect($newPrice->price)->toBe(15000)
        ->and($newPrice->member_price)->toBe(12000)
        ->and($newPrice->created_by)->toBe($admin->id);
});

it('rejects a negative price', function () {
    [$product, $outlet, $unit] = productWithPrice();
    $admin = User::role('admin')->firstOrFail();

    $this->actingAs($admin)
        ->post(route('admin.products.update-price', $product), [
            'outlet_id' => $outlet->id,
            'unit_id' => $unit->id,
            'price' => -1000,
        ])
        ->assertSessionHasErrors('price');
});

it('blocks a cashier from changing a product price', function () {
    [$product, $outlet, $unit] = productWithPrice();
    $cashier = User::role('cashier')->firstOrFail();

    $this->actingAs($cashier)
        ->post(route('admin.products.update-price', $product), [
            'outlet_id' => $outlet->id,
            'unit_id' => $unit->id,
            'price' => 20000,
        ])
        ->assertForbidden();
});
