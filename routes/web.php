<?php

use App\Http\Controllers\AuthorizationOverrideController;
use App\Http\Controllers\MidtransWebhookController;
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
Route::redirect('/login/admin', '/admin/login');
Route::redirect('/login', '/admin/login');

Route::get('/', [HomeController::class, 'index'])->name('home');
Route::get('/produk', [ProductController::class, 'index'])->name('produk.index');
Route::get('/produk/{product:slug}', [ProductController::class, 'show'])->name('produk.show');
Route::get('/promo', [PromoController::class, 'index'])->name('promo.index');
Route::get('/cek-saldo', [CheckBalanceController::class, 'index'])->name('cek-saldo.index');
Route::post('/cek-saldo', [CheckBalanceController::class, 'check'])
    // Audit Fase 6 (Temuan Tinggi): diperketat dari 10/menit — bersama
    // faktor kedua (tanggal lahir) di controller, ruang percobaan yang
    // realistis bagi penyerang sekarang jauh lebih kecil.
    ->middleware('throttle:5,1')
    ->name('cek-saldo.check');

use App\Http\Controllers\PakasirWebhookController;

// Integrasi Midtrans (top-up wali) — Notification URL, DI LUAR
// middleware `auth` SENGAJA: Midtrans tidak punya sesi Laravel,
// proteksinya verifikasi signature_key di dalam controller (lihat
// MidtransWebhookController::handle()), bukan guard login. Pola sama
// seperti /cek-saldo di atas: publik + throttle + alasan dijelaskan.
Route::post('/midtrans/notification', [MidtransWebhookController::class, 'handle'])
    ->middleware('throttle:60,1')
    ->name('midtrans.notification');

// Integrasi Pakasir Payment Gateway — Webhook Callback URL
Route::post('/api/v1/callback/pakasir', [PakasirWebhookController::class, 'handle'])
    ->middleware('throttle:60,1')
    ->name('pakasir.callback');

Route::post('/pakasir/notification', [PakasirWebhookController::class, 'handle'])
    ->middleware('throttle:60,1')
    ->name('pakasir.notification');


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
