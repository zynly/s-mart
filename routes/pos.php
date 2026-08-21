<?php

use App\Http\Controllers\Admin\ExchangeController;
use App\Http\Controllers\Admin\SaleController;
use App\Http\Controllers\Admin\SaleReturnController;
use Illuminate\Support\Facades\Route;

Route::prefix('pos')->name('pos.')->middleware(['auth'])->group(function () {
    Route::get('/', [SaleController::class, 'index'])->name('index')->middleware('can:pos.view');
    Route::get('/catalog', [SaleController::class, 'catalogApi'])->name('catalog')->middleware('can:pos.view');
    Route::get('/scan', [SaleController::class, 'scan'])->name('scan')->middleware('can:pos.view');
    Route::get('/search-member', [SaleController::class, 'searchMember'])->name('search-member')->middleware('can:pos.view');
    Route::get('/credit-check', [SaleController::class, 'creditCheck'])->name('credit-check')->middleware('can:pos.view');
    Route::post('/sales', [SaleController::class, 'store'])->name('sales.store')->middleware(['can:sale.create', 'idempotent']);
    // Integrasi Midtrans (QRIS/e-wallet/transfer) — buat token Snap
    // untuk pembayaran non-tunai SEBELUM Sale ada (lihat komentar di
    // SaleController::midtransCreatePayment()).
    Route::post('/midtrans/create-transaction', [SaleController::class, 'midtransCreatePayment'])
        ->name('midtrans.create-transaction')->middleware('can:sale.create');
    Route::post('/holds', [SaleController::class, 'hold'])->name('holds.store')->middleware('can:sale.create');
    Route::get('/holds/{saleHold}/recall', [SaleController::class, 'recall'])->name('holds.recall')->middleware('can:sale.create');
    // BUKAN can:sale.void — lihat VoidSaleRequest untuk penjelasan lengkap:
    // kasir yang memicu void tidak pernah punya sale.void sendiri, izin
    // itu divalidasi terhadap approver_id (hasil PIN supervisor) di dalam
    // VoidService::void(), bukan lewat middleware rute.
    Route::put('/sales/{sale}/void', [SaleController::class, 'void'])->name('sales.void')->middleware('can:sale.view');
    Route::get('/sales/{sale}/receipt', [SaleController::class, 'receipt'])->name('sales.receipt')->middleware('can:sale.view');
    Route::get('/sales/{sale}/receipt.pdf', [SaleController::class, 'receiptPdf'])->name('sales.receipt-pdf')->middleware('can:sale.view');

    // Retur & Tukar Barang (Fase 11)
    Route::get('/returns/lookup', [SaleReturnController::class, 'lookup'])->name('returns.lookup')->middleware('can:sale_return.view');
    Route::post('/returns/refund-preview', [SaleReturnController::class, 'refundPreview'])->name('returns.refund-preview')->middleware('can:sale_return.view');
    Route::post('/returns', [SaleReturnController::class, 'store'])->name('returns.store')->middleware(['can:sale_return.create', 'idempotent']);
    Route::post('/exchanges', [ExchangeController::class, 'store'])->name('exchanges.store')->middleware(['can:sale_return.create', 'idempotent']);
});
