<?php

use App\Models\Member;
use App\Models\Product;
use App\Models\Unit;
use App\Models\User;
use App\Services\MemberPinService;
use App\Services\SaleService;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Audit independen (2026-08-02), Fase 5 — Temuan Kritis: (a) tidak ada
 * jalur untuk MEMBUAT PIN anggota sama sekali (MemberPinService::set()
 * tidak pernah dipanggil dari mana pun); (b) MemberLimitService::
 * canPurchase() (status suspend/blocked_categories/jadwal) adalah dead
 * code — tidak pernah dipanggil dari SaleService::complete().
 */
function makeMember(array $overrides = []): Member
{
    return Member::create(array_merge([
        'member_number' => 'TST'.random_int(10000, 99999),
        'name' => 'Anggota Uji',
        'type' => 'santri',
        'status' => 'active',
    ], $overrides));
}

it('sets a member PIN via the new admin endpoint, which was previously unreachable', function () {
    $member = makeMember();
    $admin = User::role('admin')->firstOrFail();

    expect($member->pin)->toBeNull();

    $this->actingAs($admin)
        ->put(route('admin.members.set-pin', $member), ['pin' => '5678'])
        ->assertSessionDoesntHaveErrors();

    $member->refresh();
    expect($member->pin)->not->toBeNull();
    expect(app(MemberPinService::class)->verify($member, '5678'))->toBeTrue();
});

it('rejects an obviously weak PIN when setting a member PIN', function () {
    $member = makeMember();
    $admin = User::role('admin')->firstOrFail();

    $this->actingAs($admin)
        ->put(route('admin.members.set-pin', $member), ['pin' => '1234'])
        ->assertSessionHasErrors('pin');

    expect($member->fresh()->pin)->toBeNull();
});

it('blocks a purchase from a suspended member (canPurchase() was dead code)', function () {
    $fixture = posFixture();
    $member = makeMember(['status' => 'suspended', 'suspend_reason' => 'Kartu dilaporkan hilang']);
    $unit = Unit::find($fixture['product']->base_unit_id);
    $price = activeBasePrice($fixture['product'], $fixture['outlet']);

    expect(fn () => app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'member_id' => $member->id,
        'idempotency_key' => 'test-suspended-'.uniqid(),
        'items' => [['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 1]],
        'payments' => [['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => $price]],
    ]))->toThrow(DomainException::class);
});

it('blocks a purchase of a product in a category blocked for the member, but allows other categories', function () {
    $fixture = posFixture();
    $blockedCategoryId = $fixture['product']->category_id;
    $member = makeMember(['blocked_categories' => [$blockedCategoryId]]);
    $unit = Unit::find($fixture['product']->base_unit_id);
    $price = activeBasePrice($fixture['product'], $fixture['outlet']);

    expect(fn () => app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'member_id' => $member->id,
        'idempotency_key' => 'test-blocked-category-'.uniqid(),
        'items' => [['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 1]],
        'payments' => [['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => $price]],
    ]))->toThrow(DomainException::class);

    $otherProduct = Product::where('is_active', true)->where('category_id', '!=', $blockedCategoryId)->first();
    app(StockService::class)->addLayer($otherProduct, $fixture['outlet'], 50, 1000);
    $otherPrice = activeBasePrice($otherProduct, $fixture['outlet']);
    $otherUnit = Unit::find($otherProduct->base_unit_id);

    $sale = app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'member_id' => $member->id,
        'idempotency_key' => 'test-allowed-category-'.uniqid(),
        'items' => [['product_id' => $otherProduct->id, 'unit_id' => $otherUnit->id, 'qty' => 1]],
        'payments' => [['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => $otherPrice]],
    ]);

    expect($sale->status)->toBe('completed');
});

it('allows a normal active member with no restrictions to complete a purchase (regression sanity)', function () {
    $fixture = posFixture();
    $member = makeMember();
    $unit = Unit::find($fixture['product']->base_unit_id);
    $price = activeBasePrice($fixture['product'], $fixture['outlet']);

    $sale = app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'member_id' => $member->id,
        'idempotency_key' => 'test-normal-member-'.uniqid(),
        'items' => [['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 1]],
        'payments' => [['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => $price]],
    ]);

    expect($sale->status)->toBe('completed');
});
