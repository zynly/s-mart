<?php

use App\Http\Controllers\Admin\SaleController;
use Illuminate\Support\Facades\Route;

Route::prefix('pos')->name('pos.')->middleware(['auth'])->group(function () {
    Route::get('/', [SaleController::class, 'index'])->name('index')->middleware('can:pos.view');
    Route::get('/scan', [SaleController::class, 'scan'])->name('scan')->middleware('can:pos.view');
    Route::get('/search-member', [SaleController::class, 'searchMember'])->name('search-member')->middleware('can:pos.view');
    Route::post('/sales', [SaleController::class, 'store'])->name('sales.store')->middleware(['can:sale.create', 'idempotent']);
    Route::post('/holds', [SaleController::class, 'hold'])->name('holds.store')->middleware('can:sale.create');
    Route::get('/holds/{saleHold}/recall', [SaleController::class, 'recall'])->name('holds.recall')->middleware('can:sale.create');
    Route::put('/sales/{sale}/void', [SaleController::class, 'void'])->name('sales.void')->middleware('can:sale.void');
    Route::get('/sales/{sale}/receipt', [SaleController::class, 'receipt'])->name('sales.receipt')->middleware('can:sale.view');
    Route::get('/sales/{sale}/receipt.pdf', [SaleController::class, 'receiptPdf'])->name('sales.receipt-pdf')->middleware('can:sale.view');
});
