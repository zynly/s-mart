<?php

use App\Exceptions\InsufficientCashBalanceException;
use App\Models\CashAccount;
use App\Models\CashTransaction;
use App\Models\Debt;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Services\PurchaseService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Gap G-06 (2026-08-03) — sebelumnya pembelian tunai HANYA mencatat jurnal
 * GL (via PurchaseObserver), tidak pernah menyentuh saldo Akun Kas
 * operasional (`cash_accounts`/`cash_transactions`, dipakai rekonsiliasi
 * harian di Sesi & Kas) — dua "buku kas" tidak sinkron. Sekarang
 * PurchaseService::receive() memanggil CashService::recordOut() di DALAM
 * transaction yang sama dengan stok+hutang.
 */
function fundedCashAccount(int $outletId, int $balance = 1_000_000): CashAccount
{
    $account = CashAccount::create([
        'code' => 'KAS-'.uniqid(),
        'name' => 'Kas Operasional Uji',
        'type' => 'cash',
        'outlet_id' => $outletId,
        'opening_balance' => $balance,
        'is_default' => false,
        'is_drawer' => false,
        'is_active' => true,
    ]);

    $account->forceFill(['current_balance' => $balance])->save();

    return $account;
}

function purchasePayload(array $overrides = []): array
{
    // is_expirable=false supaya tidak perlu batch/tanggal kadaluwarsa —
    // di luar cakupan gap ini (lihat MissingExpiryDateException).
    $product = Product::where('is_active', true)->where('is_expirable', false)->first();
    $unit = Unit::find($product->base_unit_id);

    return array_merge([
        'invoice_no' => 'INV-'.uniqid(),
        'purchase_date' => now()->toDateString(),
        'type' => 'regular',
        'payment_type' => 'cash',
        'discount' => 0,
        'tax' => 0,
    ], $overrides, [
        'items' => $overrides['items'] ?? [
            ['product_id' => $product->id, 'unit_id' => $unit->id, 'qty' => 5, 'unit_price' => 10000],
        ],
    ]);
}

it('deducts the selected cash account balance and records a linked cash-out transaction for a cash purchase', function () {
    $fixture = posFixture();
    $supplier = Supplier::first();
    $cashAccount = fundedCashAccount($fixture['outlet']->id);

    $purchase = app(PurchaseService::class)->receive(
        [
            'supplier_id' => $supplier->id,
            'outlet_id' => $fixture['outlet']->id,
            'cash_account_id' => $cashAccount->id,
            ...purchasePayload(),
        ],
        purchasePayload()['items'],
    );

    $expectedTotal = $purchase->total;

    expect($cashAccount->fresh()->current_balance)->toBe(1_000_000 - $expectedTotal);

    $trx = CashTransaction::where('sourceable_type', Purchase::class)->where('sourceable_id', $purchase->id)->first();
    expect($trx)->not->toBeNull()
        ->and($trx->type)->toBe('out')
        ->and($trx->amount)->toBe($expectedTotal)
        ->and($trx->cash_account_id)->toBe($cashAccount->id);
});

it('does not touch any cash account for a credit purchase, and creates a Debt instead', function () {
    $fixture = posFixture();
    $supplier = Supplier::first();
    $cashAccount = fundedCashAccount($fixture['outlet']->id);

    $purchase = app(PurchaseService::class)->receive(
        [
            'supplier_id' => $supplier->id,
            'outlet_id' => $fixture['outlet']->id,
            ...purchasePayload(['payment_type' => 'credit']),
        ],
        purchasePayload()['items'],
    );

    expect($cashAccount->fresh()->current_balance)->toBe(1_000_000)
        ->and(CashTransaction::where('sourceable_type', Purchase::class)->where('sourceable_id', $purchase->id)->exists())->toBeFalse()
        ->and(Debt::where('purchase_id', $purchase->id)->exists())->toBeTrue();
});

it('rolls back the entire cash purchase (no purchase, no stock, no debt) when the cash account balance is insufficient', function () {
    $fixture = posFixture();
    $supplier = Supplier::first();
    $cashAccount = fundedCashAccount($fixture['outlet']->id, balance: 100); // jauh di bawah total pembelian

    $beforeCount = Purchase::count();

    expect(fn () => app(PurchaseService::class)->receive(
        [
            'supplier_id' => $supplier->id,
            'outlet_id' => $fixture['outlet']->id,
            'cash_account_id' => $cashAccount->id,
            ...purchasePayload(),
        ],
        purchasePayload()['items'],
    ))->toThrow(InsufficientCashBalanceException::class);

    expect(Purchase::count())->toBe($beforeCount)
        ->and($cashAccount->fresh()->current_balance)->toBe(100);
});

it('does not move cash for a consignment purchase even though payment_type is forced to cash', function () {
    $fixture = posFixture();
    $supplier = Supplier::first();
    $cashAccount = fundedCashAccount($fixture['outlet']->id);

    $purchase = app(PurchaseService::class)->receive(
        [
            'supplier_id' => $supplier->id,
            'outlet_id' => $fixture['outlet']->id,
            ...purchasePayload(['type' => 'consignment']),
        ],
        purchasePayload()['items'],
    );

    expect($purchase->type)->toBe('consignment')
        ->and($cashAccount->fresh()->current_balance)->toBe(1_000_000)
        ->and(CashTransaction::where('sourceable_type', Purchase::class)->where('sourceable_id', $purchase->id)->exists())->toBeFalse();
});

it('rejects a cash account that belongs to a different outlet than the purchase', function () {
    $fixture = posFixture();
    $supplier = Supplier::first();
    $otherOutlet = Outlet::create(['code' => 'OUT-CASH', 'name' => 'Outlet Lain Kas', 'is_active' => true]);
    $foreignCashAccount = fundedCashAccount($otherOutlet->id);

    expect(fn () => app(PurchaseService::class)->receive(
        [
            'supplier_id' => $supplier->id,
            'outlet_id' => $fixture['outlet']->id,
            'cash_account_id' => $foreignCashAccount->id,
            ...purchasePayload(),
        ],
        purchasePayload()['items'],
    ))->toThrow(DomainException::class);
});

it('rejects submitting a cash purchase via the HTTP endpoint without selecting a cash account', function () {
    $fixture = posFixture();
    $admin = User::role('admin')->firstOrFail();
    $supplier = Supplier::first();

    $this->actingAs($admin)
        ->post(route('admin.purchases.store'), [
            'supplier_id' => $supplier->id,
            'outlet_id' => $fixture['outlet']->id,
            ...purchasePayload(),
        ])
        ->assertSessionHasErrors('cash_account_id');
});
