<?php

use App\Http\Controllers\AuthorizationOverrideController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProfilePinController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('Public/Welcome'));

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
