<?php

use App\Http\Controllers\Wali\AuthController;
use App\Http\Controllers\Wali\DashboardController;
use App\Http\Controllers\Wali\MemberController;
use App\Http\Controllers\Wali\SettingController;
use App\Http\Controllers\Wali\TopupController;
use Illuminate\Support\Facades\Route;

Route::prefix('wali')->name('wali.')->group(function () {
    Route::middleware('guest:guardian')->group(function () {
        Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
        Route::post('/login', [AuthController::class, 'login'])->name('login.store')->middleware('throttle:wali-login');
    });

    Route::middleware('auth:guardian')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/anak/{member}', [MemberController::class, 'show'])->name('members.show');
        Route::get('/topup', [TopupController::class, 'create'])->name('topup.create');
        Route::post('/topup', [TopupController::class, 'store'])->name('topup.store')->middleware('idempotent');
        Route::get('/akun', [SettingController::class, 'edit'])->name('settings.edit');
        Route::put('/akun', [SettingController::class, 'update'])->name('settings.update');
    });
});
