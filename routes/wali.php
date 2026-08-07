<?php

use App\Http\Controllers\Wali\AuthController;
use App\Http\Controllers\Wali\DashboardController;
use App\Http\Controllers\Wali\ForgotPasswordController;
use App\Http\Controllers\Wali\MemberController;
use App\Http\Controllers\Wali\NotificationController;
use App\Http\Controllers\Wali\SettingController;
use App\Http\Controllers\Wali\TopupController;
use App\Http\Controllers\Admin\RoleSwitchController;
use Illuminate\Support\Facades\Route;

Route::prefix('wali')->name('wali.')->group(function () {
    // Owner impersonation — masuk sebagai Guardian Demo tanpa password
    // (hanya bisa diakses owner yang sudah login di guard 'web')
    Route::post('/owner-preview', [RoleSwitchController::class, 'enterWaliPreview'])
        ->name('owner-preview')
        ->middleware('auth:web');
    Route::post('/owner-preview/exit', [RoleSwitchController::class, 'exitWaliPreview'])
        ->name('owner-preview.exit');

    Route::middleware('guest:guardian')->group(function () {
        Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
        Route::post('/login', [AuthController::class, 'login'])->name('login.store')->middleware('throttle:wali-login');

        // REVISI-R1-v2.md §8.1 — "Lupa Password" via pertanyaan
        // keamanan. Rate-limit di level RateLimiter::for() (lihat
        // FortifyServiceProvider) TIDAK dipakai di sini — lockout
        // 3x/24 jam dikelola sendiri oleh GuardianPasswordResetService
        // (lebih ketat & per-nomor-HP, bukan per-IP).
        Route::get('/lupa-password', [ForgotPasswordController::class, 'showPhoneForm'])->name('forgot-password.phone');
        Route::post('/lupa-password', [ForgotPasswordController::class, 'submitPhone'])->name('forgot-password.phone.store')->middleware('throttle:20,1');
        Route::get('/lupa-password/verifikasi', [ForgotPasswordController::class, 'showVerifyForm'])->name('forgot-password.verify');
        Route::post('/lupa-password/verifikasi', [ForgotPasswordController::class, 'submitVerify'])->name('forgot-password.verify.store')->middleware('throttle:20,1');
        Route::get('/lupa-password/reset', [ForgotPasswordController::class, 'showResetForm'])->name('forgot-password.reset');
        Route::post('/lupa-password/reset', [ForgotPasswordController::class, 'submitReset'])->name('forgot-password.reset.store')->middleware('throttle:20,1');
    });

    // Gap G-09: 'auth.session' (alias bawaan Laravel utk
    // Illuminate\Session\Middleware\AuthenticateSession) diperlukan agar
    // Auth::guard('guardian')->logoutOtherDevices() di
    // SettingController::updatePassword() benar-benar mencabut sesi
    // wali di PERANGKAT LAIN (SESSION_DRIVER=database — lihat
    // config/session.php), bukan cuma memutar ulang remember token.
    Route::middleware(['auth:guardian', 'auth.session'])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/anak', [MemberController::class, 'index'])->name('members.index');
        Route::get('/anak/{member}', [MemberController::class, 'show'])->name('members.show');
        Route::post('/anak/{member}/laporkan-kartu', [MemberController::class, 'reportLostCard'])->name('members.report-lost-card');
        Route::get('/topup', [TopupController::class, 'create'])->name('topup.create');
        Route::post('/topup', [TopupController::class, 'store'])->name('topup.store')->middleware('idempotent');
        // Integrasi Midtrans — dipanggil via fetch() JSON (bukan Inertia
        // post) karena frontend butuh `token` balik untuk snap.pay().
        // Dedup dijaga TopupRequestService::assertNoDuplicatePending(),
        // bukan middleware idempotent.
        Route::post('/topup/midtrans', [TopupController::class, 'storeMidtrans'])->name('topup.midtrans');
        Route::get('/akun', [SettingController::class, 'edit'])->name('settings.edit');
        Route::put('/akun', [SettingController::class, 'update'])->name('settings.update');
        Route::put('/akun/password', [SettingController::class, 'updatePassword'])->name('settings.password')->middleware('throttle:wali-password-change');

        // fase-16-v2.md §8-9 — lonceng notifikasi in-app, pola sama
        // dengan grup 'admin.notifications.*'.
        Route::prefix('notifikasi')->name('notifications.')->group(function () {
            Route::get('/', [NotificationController::class, 'index'])->name('index');
            Route::get('/jumlah', [NotificationController::class, 'count'])->name('count');
            Route::post('{id}/baca', [NotificationController::class, 'markAsRead'])->name('read');
            Route::post('baca-semua', [NotificationController::class, 'markAllAsRead'])->name('read-all');
        });
    });
});
