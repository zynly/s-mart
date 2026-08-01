<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Fase 18 (temuan audit lintas-fase, T-106): route Fortify
 * password.email/password.update sama sekali tidak punya rate limit
 * (dicek langsung di vendor/laravel/fortify/routes/routes.php — beda
 * dari login/two-factor/passkeys yang sudah dilindungi sejak awal).
 * Global (bukan per-route) — memeriksa nama route sendiri di
 * `handle()` — supaya tidak bergantung pada urutan boot provider paket
 * vs provider app (sempat dicoba lewat Route::getRoutes()->
 * getByName()->middleware() di FortifyServiceProvider::boot(), terbukti
 * rapuh: hanya bekerja kalau boot() dipanggil dua kali).
 */
class ThrottlePasswordReset
{
    private const MAX_ATTEMPTS = 5;

    private const DECAY_SECONDS = 60;

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->routeIs('password.email', 'password.update')) {
            return $next($request);
        }

        $key = 'password-reset:'.Str::transliterate(Str::lower((string) $request->input('email'))).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS)) {
            throw ValidationException::withMessages([
                'email' => 'Terlalu banyak percobaan. Coba lagi dalam '.RateLimiter::availableIn($key).' detik.',
            ]);
        }

        RateLimiter::hit($key, self::DECAY_SECONDS);

        return $next($request);
    }
}
