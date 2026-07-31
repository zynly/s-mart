<?php

use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\BrandController;
use App\Http\Controllers\Admin\CashController;
use App\Http\Controllers\Admin\CashierSessionController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\ConsignmentController;
use App\Http\Controllers\Admin\DebtController;
use App\Http\Controllers\Admin\DepositController;
use App\Http\Controllers\Admin\MemberController;
use App\Http\Controllers\Admin\OutletController;
use App\Http\Controllers\Admin\PaymentMethodController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\PurchaseController;
use App\Http\Controllers\Admin\PurchaseOrderController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\StockController;
use App\Http\Controllers\Admin\SupplierController;
use App\Http\Controllers\Admin\UnitController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::prefix('admin')->name('admin.')->middleware(['auth'])->group(function () {
    Route::get('/', fn () => Inertia::render('Admin/Dashboard'))->name('dashboard');

    Route::middleware('can:user.view')->group(function () {
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
    });
    Route::post('/users', [UserController::class, 'store'])->name('users.store')->middleware('can:user.create');
    Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update')->middleware('can:user.update');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy')->middleware('can:user.delete');
    Route::put('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password')->middleware('can:user.update');
    Route::put('/users/{user}/pin', [UserController::class, 'setPin'])->name('users.set-pin')->middleware('can:user.update');

    Route::middleware('can:role.view')->group(function () {
        Route::get('/roles', [RoleController::class, 'index'])->name('roles.index');
    });
    Route::post('/roles', [RoleController::class, 'store'])->name('roles.store')->middleware('can:role.create');
    Route::put('/roles/{role}', [RoleController::class, 'update'])->name('roles.update')->middleware('can:role.update');

    Route::get('/activity-logs', [ActivityLogController::class, 'index'])
        ->name('activity-logs.index');

    // Master Data (Fase 2)
    Route::middleware('can:product.view')->group(function () {
        Route::get('/products', [ProductController::class, 'index'])->name('products.index');
    });
    Route::post('/products', [ProductController::class, 'store'])->name('products.store')->middleware('can:product.create');
    Route::put('/products/{product}', [ProductController::class, 'update'])->name('products.update')->middleware('can:product.update');
    Route::delete('/products/{product}', [ProductController::class, 'destroy'])->name('products.destroy')->middleware('can:product.delete');

    Route::middleware('can:category.view')->group(function () {
        Route::get('/categories', [CategoryController::class, 'index'])->name('categories.index');
    });
    Route::post('/categories', [CategoryController::class, 'store'])->name('categories.store')->middleware('can:category.create');
    Route::put('/categories/{category}', [CategoryController::class, 'update'])->name('categories.update')->middleware('can:category.update');
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy')->middleware('can:category.delete');

    Route::middleware('can:brand.view')->group(function () {
        Route::get('/brands', [BrandController::class, 'index'])->name('brands.index');
    });
    Route::post('/brands', [BrandController::class, 'store'])->name('brands.store')->middleware('can:brand.create');
    Route::put('/brands/{brand}', [BrandController::class, 'update'])->name('brands.update')->middleware('can:brand.update');
    Route::delete('/brands/{brand}', [BrandController::class, 'destroy'])->name('brands.destroy')->middleware('can:brand.delete');

    Route::middleware('can:unit.view')->group(function () {
        Route::get('/units', [UnitController::class, 'index'])->name('units.index');
    });
    Route::post('/units', [UnitController::class, 'store'])->name('units.store')->middleware('can:unit.create');
    Route::put('/units/{unit}', [UnitController::class, 'update'])->name('units.update')->middleware('can:unit.update');
    Route::delete('/units/{unit}', [UnitController::class, 'destroy'])->name('units.destroy')->middleware('can:unit.delete');

    Route::middleware('can:supplier.view')->group(function () {
        Route::get('/suppliers', [SupplierController::class, 'index'])->name('suppliers.index');
    });
    Route::post('/suppliers', [SupplierController::class, 'store'])->name('suppliers.store')->middleware('can:supplier.create');
    Route::put('/suppliers/{supplier}', [SupplierController::class, 'update'])->name('suppliers.update')->middleware('can:supplier.update');
    Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy'])->name('suppliers.destroy')->middleware('can:supplier.delete');

    Route::middleware('can:setting.view')->group(function () {
        Route::get('/payment-methods', [PaymentMethodController::class, 'index'])->name('payment-methods.index');
        Route::get('/outlets', [OutletController::class, 'index'])->name('outlets.index');
    });
    Route::post('/payment-methods', [PaymentMethodController::class, 'store'])->name('payment-methods.store')->middleware('can:setting.create');
    Route::put('/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'update'])->name('payment-methods.update')->middleware('can:setting.update');
    Route::delete('/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'destroy'])->name('payment-methods.destroy')->middleware('can:setting.delete');
    Route::post('/outlets', [OutletController::class, 'store'])->name('outlets.store')->middleware('can:outlet.create');
    Route::put('/outlets/{outlet}', [OutletController::class, 'update'])->name('outlets.update')->middleware('can:outlet.update');
    Route::delete('/outlets/{outlet}', [OutletController::class, 'destroy'])->name('outlets.destroy')->middleware('can:outlet.delete');

    // Anggota & Kartu (Fase 3)
    Route::middleware('can:member.view')->group(function () {
        Route::get('/members', [MemberController::class, 'index'])->name('members.index');
    });
    Route::post('/members', [MemberController::class, 'store'])->name('members.store')->middleware('can:member.create');
    Route::put('/members/{member}', [MemberController::class, 'update'])->name('members.update')->middleware('can:member.update');
    Route::delete('/members/{member}', [MemberController::class, 'destroy'])->name('members.destroy')->middleware('can:member.delete');
    Route::put('/members/{member}/reset-pin', [MemberController::class, 'resetPin'])->name('members.reset-pin')->middleware('can:member.update');
    Route::post('/members/{member}/reissue-card', [MemberController::class, 'reissueCard'])->name('members.reissue-card')->middleware('can:card.create');
    Route::get('/members/print-cards', [MemberController::class, 'printCards'])->name('members.print-cards')->middleware('can:member.print');

    // Deposit & Saldo (Fase 4)
    Route::middleware('can:deposit.view')->group(function () {
        Route::get('/deposit', [DepositController::class, 'index'])->name('deposit.index');
    });
    Route::post('/deposit/topup', [DepositController::class, 'storeTopup'])->name('deposit.topup')->middleware(['can:topup.create', 'idempotent']);
    Route::post('/deposit/withdrawal', [DepositController::class, 'storeWithdrawal'])->name('deposit.withdrawal')->middleware(['can:withdrawal.create', 'idempotent']);
    Route::post('/deposit/adjustment', [DepositController::class, 'storeAdjustment'])->name('deposit.adjustment')->middleware(['can:deposit.adjust', 'idempotent']);

    // Inventory & Stock Layer FEFO (Fase 5)
    Route::middleware('can:stock.view')->group(function () {
        Route::get('/stock', [StockController::class, 'index'])->name('stock.index');
        Route::get('/stock/{product}/movements', [StockController::class, 'movements'])->name('stock.movements');
    });

    // Pembelian, Konsinyasi & Hutang (Fase 6)
    Route::middleware('can:purchase_order.view')->group(function () {
        Route::get('/purchase-orders', [PurchaseOrderController::class, 'index'])->name('purchase-orders.index');
    });
    Route::post('/purchase-orders', [PurchaseOrderController::class, 'store'])->name('purchase-orders.store')->middleware('can:purchase_order.create');
    Route::put('/purchase-orders/{purchaseOrder}/approve', [PurchaseOrderController::class, 'approve'])->name('purchase-orders.approve')->middleware('can:purchase_order.approve');

    Route::middleware('can:purchase.view')->group(function () {
        Route::get('/purchases', [PurchaseController::class, 'index'])->name('purchases.index');
        Route::get('/purchases/{purchase}', [PurchaseController::class, 'show'])->name('purchases.show');
        Route::get('/purchases/{purchase}/items', [PurchaseController::class, 'items'])->name('purchases.items');
    });
    Route::post('/purchases', [PurchaseController::class, 'store'])->name('purchases.store')->middleware('can:purchase.create');
    Route::post('/purchase-returns', [PurchaseController::class, 'storeReturn'])->name('purchase-returns.store')->middleware('can:purchase_return.create');

    Route::middleware('can:debt.view')->group(function () {
        Route::get('/debts', [DebtController::class, 'index'])->name('debts.index');
    });
    Route::post('/debts/{debt}/pay', [DebtController::class, 'pay'])->name('debts.pay')->middleware('can:debt.update');

    Route::middleware('can:consignment.view')->group(function () {
        Route::get('/consignment', [ConsignmentController::class, 'index'])->name('consignment.index');
    });
    Route::post('/consignment', [ConsignmentController::class, 'store'])->name('consignment.store')->middleware('can:consignment.create');
    Route::put('/consignment/{consignment}/approve', [ConsignmentController::class, 'approve'])->name('consignment.approve')->middleware('can:consignment.approve');
    Route::put('/consignment/{consignment}/mark-paid', [ConsignmentController::class, 'markPaid'])->name('consignment.mark-paid')->middleware('can:consignment.update');

    // Sesi Kasir & Kas (Fase 7)
    Route::middleware('can:pos.view')->group(function () {
        Route::get('/cashier-session', [CashierSessionController::class, 'index'])->name('cashier-session.index');
    });
    Route::post('/cashier-session/open', [CashierSessionController::class, 'open'])->name('cashier-session.open')->middleware('can:pos.create');
    Route::put('/cashier-session/{cashierSession}/close', [CashierSessionController::class, 'close'])->name('cashier-session.close')->middleware('can:pos.update');

    Route::middleware('can:cash.view')->group(function () {
        Route::get('/cash', [CashController::class, 'index'])->name('cash.index');
    });
    Route::post('/cash/in', [CashController::class, 'storeIn'])->name('cash.in')->middleware('can:cash.create');
    Route::post('/cash/out', [CashController::class, 'storeOut'])->name('cash.out')->middleware('can:cash.create');
    Route::post('/cash/transfer', [CashController::class, 'transfer'])->name('cash.transfer')->middleware('can:cash.create');
});
