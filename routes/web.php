<?php

use App\Http\Controllers\AuthorizationOverrideController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProfilePinController;
use App\Http\Controllers\Public\CheckBalanceController;
use App\Http\Controllers\Public\HomeController;
use App\Http\Controllers\Public\ProductController;
use App\Http\Controllers\Public\PromoController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// T-111 (Fase 19). Storefront publik — tanpa auth, sengaja (ADR-0009:
// transparansi harga utk CALON santri/wali, bukan cuma yang sudah
// terdaftar). Setiap controller di sini WAJIB lewat
// StorefrontService/Product::scopePublic(), lihat catatan keamanan di
// app/Data/ProductPublicData.php.
Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/produk', [ProductController::class, 'index'])->name('produk.index');
Route::get('/produk/{product:slug}', [ProductController::class, 'show'])->name('produk.show');
Route::get('/promo', [PromoController::class, 'index'])->name('promo.index');
Route::get('/cek-saldo', [CheckBalanceController::class, 'index'])->name('cek-saldo.index');
Route::post('/cek-saldo', [CheckBalanceController::class, 'check'])
    ->middleware('throttle:10,1')
    ->name('cek-saldo.check');

// Temuan audit keamanan: halaman showcase komponen internal ini
// sebelumnya terdaftar TANPA guard apa pun — publik di produksi,
// membocorkan peta komponen internal & stack yang dipakai. Dev-only.
if (app()->environment('local')) {
    Route::get('/uji-komponen', fn () => Inertia::render('UjiKomponen'));
}

Route::middleware('auth')->group(function () {
    Route::post('/authorization/override', AuthorizationOverrideController::class)
        ->name('authorization.override');

    Route::get('/profil', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profil', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/profil/pin', ProfilePinController::class)->name('profile.pin.update');
});
