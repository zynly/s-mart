<?php

use App\Http\Controllers\Admin\AccountController;
use App\Http\Controllers\Admin\AccountingPeriodController;
use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\BalanceSheetController;
use App\Http\Controllers\Admin\BrandController;
use App\Http\Controllers\Admin\CashController;
use App\Http\Controllers\Admin\CashierSessionController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\ConsignmentController;
use App\Http\Controllers\Admin\CouponController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DebtController;
use App\Http\Controllers\Admin\DepositController;
use App\Http\Controllers\Admin\GuardianController;
use App\Http\Controllers\Admin\JournalController;
use App\Http\Controllers\Admin\LedgerController;
use App\Http\Controllers\Admin\MemberController;
use App\Http\Controllers\Admin\NotificationController;
use App\Http\Controllers\Admin\OpnameController;
use App\Http\Controllers\Admin\OutletController;
use App\Http\Controllers\Admin\PaymentMethodController;
use App\Http\Controllers\Admin\PointController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\ProfitLossController;
use App\Http\Controllers\Admin\PromoController;
use App\Http\Controllers\Admin\PurchaseController;
use App\Http\Controllers\Admin\PurchaseOrderController;
use App\Http\Controllers\Admin\ReceivableController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\SaleReturnController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\StockAdjustmentController;
use App\Http\Controllers\Admin\StockController;
use App\Http\Controllers\Admin\SupplierController;
use App\Http\Controllers\Admin\SystemResetController;
use App\Http\Controllers\Admin\TopupRequestController;
use App\Http\Controllers\Admin\TransferController;
use App\Http\Controllers\Admin\TrialBalanceController;
use App\Http\Controllers\Admin\UnitController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\WriteOffController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')->name('admin.')->middleware(['auth'])->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    Route::prefix('notifications')->name('notifications.')->group(function () {
        Route::get('/', [NotificationController::class, 'index'])->name('index');
        Route::post('{id}/read', [NotificationController::class, 'markAsRead'])->name('read');
        Route::post('read-all', [NotificationController::class, 'markAllAsRead'])->name('read-all');
    });

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

    // Bug nyata ditemukan Fase UI-01: route ini sebelumnya TIDAK punya
    // gate permission sama sekali (cuma 'auth') — siapa pun yang login,
    // termasuk kasir, bisa lihat log aktivitas seluruh sistem.
    Route::get('/activity-logs', [ActivityLogController::class, 'index'])
        ->name('activity-logs.index')
        ->middleware('can:setting.view');

    // Master Data (Fase 2)
    Route::middleware('can:product.view')->group(function () {
        Route::get('/products', [ProductController::class, 'index'])->name('products.index');
    });
    Route::post('/products', [ProductController::class, 'store'])->name('products.store')->middleware('can:product.create');
    Route::put('/products/{product}', [ProductController::class, 'update'])->name('products.update')->middleware('can:product.update');
    Route::post('/products/{product}/price', [ProductController::class, 'updatePrice'])->name('products.update-price')->middleware('can:product.update');
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
    Route::put('/members/{member}/set-pin', [MemberController::class, 'setPin'])->name('members.set-pin')->middleware('can:member.update');
    Route::post('/members/{member}/reissue-card', [MemberController::class, 'reissueCard'])->name('members.reissue-card')->middleware('can:card.create');
    Route::get('/members/print-cards', [MemberController::class, 'printCards'])->name('members.print-cards')->middleware('can:member.print');
    Route::get('/members/{member}/preview-card', [MemberController::class, 'previewCard'])->name('members.preview-card')->middleware('can:member.print');

    // Portal Wali — kelola akun wali (Fase 16, T-095/T-096). Gap yang
    // tidak ditulis eksplisit di spec: tanpa ini tidak ada cara admin
    // membuat akun Guardian. Digabung ke gate member.update, bukan
    // modul permission baru.
    Route::post('/members/{member}/guardians', [GuardianController::class, 'store'])->name('members.guardians.store')->middleware('can:member.update');
    Route::delete('/members/{member}/guardians/{guardian}', [GuardianController::class, 'destroy'])->name('members.guardians.destroy')->middleware('can:member.update');
    Route::put('/guardians/{guardian}/reset-password', [GuardianController::class, 'resetPassword'])->name('guardians.reset-password')->middleware('can:member.update');
    Route::put('/guardians/{guardian}/toggle-active', [GuardianController::class, 'toggleActive'])->name('guardians.toggle-active')->middleware('can:member.update');

    // Deposit & Saldo (Fase 4)
    Route::middleware('can:deposit.view')->group(function () {
        Route::get('/deposit', [DepositController::class, 'index'])->name('deposit.index');
        Route::get('/deposit/adjustments/export', [DepositController::class, 'exportAdjustments'])->name('deposit.adjustments.export');
    });
    Route::post('/deposit/topup', [DepositController::class, 'storeTopup'])->name('deposit.topup')->middleware(['can:topup.create', 'idempotent']);
    Route::post('/deposit/withdrawal', [DepositController::class, 'storeWithdrawal'])->name('deposit.withdrawal')->middleware(['can:withdrawal.create', 'idempotent']);
    Route::post('/deposit/adjustment', [DepositController::class, 'storeAdjustment'])->name('deposit.adjustment')->middleware(['can:deposit.adjust', 'idempotent']);

    // Verifikasi top-up wali (Fase 16, T-098) — tab saudara dari Deposit.
    Route::middleware('can:topup.view')->group(function () {
        Route::get('/topup-requests', [TopupRequestController::class, 'index'])->name('topup-requests.index');
        Route::get('/topup-requests/{topupRequest}/proof', [TopupRequestController::class, 'proof'])->name('topup-requests.proof');
    });
    Route::put('/topup-requests/{topupRequest}/approve', [TopupRequestController::class, 'approve'])->name('topup-requests.approve')->middleware('can:topup.approve');
    Route::put('/topup-requests/{topupRequest}/reject', [TopupRequestController::class, 'reject'])->name('topup-requests.reject')->middleware('can:topup.approve');

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
    // REVISI-R1-v2.md §1.7 — Kelola Laci.
    Route::post('/cash-accounts', [CashController::class, 'storeAccount'])->name('cash-accounts.store')->middleware('can:cash.create');
    Route::put('/cash-accounts/{cashAccount}', [CashController::class, 'updateAccount'])->name('cash-accounts.update')->middleware('can:cash.update');

    // Piutang Anggota (Fase 9 — T-060)
    Route::middleware('can:receivable.view')->group(function () {
        Route::get('/receivables', [ReceivableController::class, 'index'])->name('receivables.index');
    });
    Route::post('/receivables/{receivable}/pay', [ReceivableController::class, 'pay'])->name('receivables.pay')->middleware('can:receivable.update');
    Route::delete('/receivables/{receivable}', [ReceivableController::class, 'writeOff'])->name('receivables.write-off')->middleware('can:receivable.delete');

    // Diskon & Promo (Fase 10 — T-067)
    Route::middleware('can:promo.view')->group(function () {
        Route::get('/promos', [PromoController::class, 'index'])->name('promos.index');
    });
    Route::post('/promos', [PromoController::class, 'store'])->name('promos.store')->middleware('can:promo.create');
    Route::put('/promos/{promo}', [PromoController::class, 'update'])->name('promos.update')->middleware('can:promo.update');
    Route::put('/promos/{promo}/toggle', [PromoController::class, 'toggle'])->name('promos.toggle')->middleware('can:promo.update');
    Route::delete('/promos/{promo}', [PromoController::class, 'destroy'])->name('promos.destroy')->middleware('can:promo.delete');

    Route::middleware('can:coupon.view')->group(function () {
        Route::get('/coupons', [CouponController::class, 'index'])->name('coupons.index');
    });
    Route::post('/coupons', [CouponController::class, 'store'])->name('coupons.store')->middleware('can:coupon.create');
    Route::put('/coupons/{coupon}/cancel', [CouponController::class, 'cancel'])->name('coupons.cancel')->middleware('can:coupon.update');

    Route::get('/points', [PointController::class, 'index'])->name('points.index')->middleware('can:member.view');

    // Retur, Void & Koreksi (Fase 11)
    Route::middleware('can:sale_return.view')->group(function () {
        Route::get('/sale-returns', [SaleReturnController::class, 'index'])->name('sale-returns.index');
    });
    Route::get('/sale-returns/create', [SaleReturnController::class, 'create'])->name('sale-returns.create')->middleware('can:sale_return.create');

    Route::middleware('can:adjustment.view')->group(function () {
        Route::get('/write-offs', [WriteOffController::class, 'index'])->name('write-offs.index');
    });
    Route::post('/write-offs', [WriteOffController::class, 'store'])->name('write-offs.store')->middleware('can:adjustment.create');
    Route::put('/write-offs/{writeOff}/approve', [WriteOffController::class, 'approve'])->name('write-offs.approve')->middleware('can:adjustment.approve');
    Route::put('/write-offs/{writeOff}/process', [WriteOffController::class, 'process'])->name('write-offs.process')->middleware('can:adjustment.approve');
    Route::put('/write-offs/{writeOff}/reject', [WriteOffController::class, 'reject'])->name('write-offs.reject')->middleware('can:adjustment.approve');

    // Stock Opname, Transfer & Penyesuaian (Fase 12)
    Route::middleware('can:opname.view')->group(function () {
        Route::get('/opnames', [OpnameController::class, 'index'])->name('opnames.index');
        Route::get('/opnames/{opname}', [OpnameController::class, 'show'])->name('opnames.show');
    });
    Route::post('/opnames', [OpnameController::class, 'store'])->name('opnames.store')->middleware('can:opname.create');
    Route::post('/opnames/{opname}/scan', [OpnameController::class, 'scan'])->name('opnames.scan')->middleware('can:opname.update');
    Route::post('/opnames/{opname}/count', [OpnameController::class, 'count'])->name('opnames.count')->middleware('can:opname.update');
    Route::put('/opnames/{opname}/reason', [OpnameController::class, 'updateReason'])->name('opnames.reason')->middleware('can:opname.update');
    Route::put('/opnames/{opname}/finish-counting', [OpnameController::class, 'finishCounting'])->name('opnames.finish-counting')->middleware('can:opname.update');
    Route::put('/opnames/{opname}/approve', [OpnameController::class, 'approve'])->name('opnames.approve')->middleware('can:opname.approve');
    Route::put('/opnames/{opname}/post', [OpnameController::class, 'post'])->name('opnames.post')->middleware('can:opname.approve');
    Route::put('/opnames/{opname}/cancel', [OpnameController::class, 'cancel'])->name('opnames.cancel')->middleware('can:opname.update');

    Route::middleware('can:transfer.view')->group(function () {
        Route::get('/transfers', [TransferController::class, 'index'])->name('transfers.index');
    });
    Route::post('/transfers', [TransferController::class, 'store'])->name('transfers.store')->middleware('can:transfer.create');
    Route::put('/transfers/{transfer}/approve', [TransferController::class, 'approve'])->name('transfers.approve')->middleware('can:transfer.approve');
    Route::put('/transfers/{transfer}/send', [TransferController::class, 'send'])->name('transfers.send')->middleware('can:transfer.update');
    Route::put('/transfers/{transfer}/receive', [TransferController::class, 'receive'])->name('transfers.receive')->middleware('can:transfer.update');
    Route::put('/transfers/{transfer}/cancel', [TransferController::class, 'cancel'])->name('transfers.cancel')->middleware('can:transfer.update');

    Route::middleware('can:adjustment.view')->group(function () {
        Route::get('/stock-adjustments', [StockAdjustmentController::class, 'index'])->name('stock-adjustments.index');
    });
    Route::get('/stock-adjustments/{product}/layers', [StockAdjustmentController::class, 'layers'])->name('stock-adjustments.layers')->middleware('can:adjustment.create');
    Route::post('/stock-adjustments', [StockAdjustmentController::class, 'store'])->name('stock-adjustments.store')->middleware('can:adjustment.create');
    Route::put('/stock-adjustments/{stockAdjustment}/approve', [StockAdjustmentController::class, 'approve'])->name('stock-adjustments.approve')->middleware('can:adjustment.approve');
    Route::put('/stock-adjustments/{stockAdjustment}/post', [StockAdjustmentController::class, 'post'])->name('stock-adjustments.post')->middleware('can:adjustment.approve');

    // Akuntansi: COA, Jurnal & Buku Besar (Fase 13)
    Route::middleware('can:setting.view')->group(function () {
        Route::get('/accounts', [AccountController::class, 'index'])->name('accounts.index');
    });
    Route::post('/accounts', [AccountController::class, 'store'])->name('accounts.store')->middleware('can:setting.create');
    Route::put('/accounts/{account}', [AccountController::class, 'update'])->name('accounts.update')->middleware('can:setting.update');
    Route::delete('/accounts/{account}', [AccountController::class, 'destroy'])->name('accounts.destroy')->middleware('can:setting.delete');

    Route::middleware('can:journal.view')->group(function () {
        Route::get('/journals', [JournalController::class, 'index'])->name('journals.index');
        Route::get('/journals/{journal}', [JournalController::class, 'show'])->name('journals.show');
    });
    Route::post('/journals', [JournalController::class, 'store'])->name('journals.store')->middleware('can:journal.create');
    Route::put('/journals/{journal}/post', [JournalController::class, 'post'])->name('journals.post')->middleware('can:journal.approve');
    // Audit Fase 7 (Temuan Rendah): dipisah dari journal.approve (dipakai
    // posting draft manual, risiko rendah) — membalik jurnal POSTED
    // (termasuk seluruh jurnal otomatis) adalah aksi berisiko tinggi,
    // dibatasi ke owner (pola sama seperti period.close).
    Route::put('/journals/{journal}/reverse', [JournalController::class, 'reverse'])->name('journals.reverse')->middleware('can:journal.reverse');

    Route::middleware('can:ledger.view')->group(function () {
        Route::get('/ledger', [LedgerController::class, 'index'])->name('ledger.index');
        Route::get('/trial-balance', [TrialBalanceController::class, 'index'])->name('trial-balance.index');
        Route::get('/profit-loss', [ProfitLossController::class, 'index'])->name('profit-loss.index');
        Route::get('/balance-sheet', [BalanceSheetController::class, 'index'])->name('balance-sheet.index');
        Route::get('/accounting-periods', [AccountingPeriodController::class, 'index'])->name('accounting-periods.index');
    });
    Route::put('/accounting-periods/close', [AccountingPeriodController::class, 'close'])->name('accounting-periods.close')->middleware('can:period.close');
    Route::put('/accounting-periods/reopen', [AccountingPeriodController::class, 'reopen'])->name('accounting-periods.reopen')->middleware('can:period.close');

    // Laporan (Fase 14) — gating akses per laporan dilakukan di dalam
    // ReportController::visibleTo() (kategori vs role, T-090), bukan
    // middleware can: di sini (report.view dipegang semua role termasuk
    // kasir, tidak cukup untuk membedakan cakupannya).
    Route::middleware('can:report.view')->group(function () {
        Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('/reports/{key}', [ReportController::class, 'show'])->name('reports.show');
        Route::post('/reports/{key}/export', [ReportController::class, 'export'])->name('reports.export');
    });
    Route::get('/reports-download/{filename}', [ReportController::class, 'download'])->name('reports.download')->middleware('signed');

    // Pengaturan & Danger Zone (Fase 17 — T-103/T-104)
    Route::middleware('can:setting.view')->group(function () {
        Route::get('/settings', [SettingController::class, 'index'])->name('settings.index');
    });
    Route::put('/settings/{section}', [SettingController::class, 'update'])->name('settings.update')->middleware('can:setting.update');

    Route::middleware('can:system.reset')->group(function () {
        Route::get('/settings-danger-zone', [SystemResetController::class, 'index'])->name('settings.danger-zone');
        Route::post('/settings-danger-zone/reset-transactions', [SystemResetController::class, 'resetTransactions'])->name('settings.reset-transactions');

        // Modul Uji Integrasi System & Env
        Route::get('/integrations', [\App\Http\Controllers\Admin\IntegrationController::class, 'index'])->name('integrations.index');
        Route::post('/integrations/test-storage', [\App\Http\Controllers\Admin\IntegrationController::class, 'testStorage'])->name('integrations.test-storage');
        Route::post('/integrations/test-midtrans', [\App\Http\Controllers\Admin\IntegrationController::class, 'testMidtrans'])->name('integrations.test-midtrans');
        Route::post('/integrations/test-smtp', [\App\Http\Controllers\Admin\IntegrationController::class, 'testSmtp'])->name('integrations.test-smtp');
        Route::post('/integrations/test-db', [\App\Http\Controllers\Admin\IntegrationController::class, 'testDatabase'])->name('integrations.test-db');
        Route::post('/integrations/update-midtrans-channels', [\App\Http\Controllers\Admin\IntegrationController::class, 'updatePaymentMethods'])->name('integrations.update-midtrans-channels');
    });
});
