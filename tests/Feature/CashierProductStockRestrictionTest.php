<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * REVISI-R1-v2.md §8.4 — cashier hanya boleh MELIHAT produk & stok.
 * Diverifikasi: role `cashier` di RolePermissionSeeder sudah HANYA
 * memegang `product.view`/`stock.view` (tidak pernah memegang create/
 * update/delete untuk product/stock/category/brand/unit) — sudah benar
 * dari awal, test ini mengunci perilaku itu di level route/middleware
 * supaya regresi di masa depan langsung ketahuan.
 */
it('blocks a cashier from creating a product via the route, even with a forged direct request', function () {
    $cashier = User::role('cashier')->firstOrFail();

    $this->actingAs($cashier)
        ->post(route('admin.products.store'), [])
        ->assertForbidden();
});

it('blocks a cashier from creating a stock adjustment via the route', function () {
    $cashier = User::role('cashier')->firstOrFail();

    $this->actingAs($cashier)
        ->post(route('admin.stock-adjustments.store'), [])
        ->assertForbidden();
});

it('still allows a cashier to view the product and stock pages', function () {
    $cashier = User::role('cashier')->firstOrFail();

    $this->actingAs($cashier)->get(route('admin.products.index'))->assertOk();
    $this->actingAs($cashier)->get(route('admin.stock.index'))->assertOk();
});
