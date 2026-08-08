<?php

use App\Http\Middleware\AdjustSessionLifetime;
use App\Http\Middleware\EnsureIdempotencyKey;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\ThrottlePasswordReset;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            Route::middleware('web')->group(base_path('routes/admin.php'));
            Route::middleware('web')->group(base_path('routes/pos.php'));
            Route::middleware('web')->group(base_path('routes/wali.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->validateCsrfTokens(except: [
            'midtrans/notification',
            'api/v1/callback/pakasir',
            'pakasir/notification',
        ]);

        $middleware->web(append: [
            AdjustSessionLifetime::class,
            HandleInertiaRequests::class,
            SecurityHeaders::class,
            ThrottlePasswordReset::class,
        ]);

        $middleware->alias([
            'idempotent' => EnsureIdempotencyKey::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Temuan audit keamanan: handler ini sebelumnya kosong total —
        // DomainException dari service yang TIDAK di-try/catch eksplisit
        // di controller (mis. Wali\TopupController::store() memanggil
        // TopupRequestService::submit() langsung) jatuh jadi 500 mentah.
        // Buruk khususnya untuk wali (pengguna awam di HP) yang seharusnya
        // melihat pesan error biasa, bukan halaman crash. Controller yang
        // SUDAH menangkap DomainException sendiri (mayoritas) tidak
        // terpengaruh — catch block mereka jalan duluan, closure ini cuma
        // jaring pengaman untuk yang lolos.
        $exceptions->renderable(function (DomainException $e, Request $request) {
            if ($request->header('X-Inertia')) {
                return back()->with('error', $e->getMessage());
            }
        });

        // Audit Fase 7 (Temuan Rendah): idempotency check di SaleService::
        // complete()/SaleReturnService::createAndProcess() (SELECT lalu
        // INSERT, tanpa lock) dilindungi dari double-charge oleh unique
        // constraint DB (idempotency_key) — TAPI request duplikat yang
        // genuinely race (retry jaringan nyaris bersamaan) sebelumnya
        // dapat 500 mentah, bukan respons yang wajar. Jaring pengaman
        // yang sama seperti DomainException di atas, bukan pengganti
        // perbaikan di titik asalnya.
        $exceptions->renderable(function (UniqueConstraintViolationException $e, Request $request) {
            if ($request->header('X-Inertia')) {
                return back()->with('error', 'Transaksi ini kemungkinan sudah diproses sebelumnya (permintaan ganda) — periksa riwayat sebelum mencoba lagi.');
            }
        });
    })->create();
