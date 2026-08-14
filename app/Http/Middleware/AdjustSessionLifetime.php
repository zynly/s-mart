<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdjustSessionLifetime
{
    /**
     * Timeout per role dalam menit (CATATAN-PERBAIKAN.md § Fase 1).
     *
     * @var array<string, int>
     */
    private const LIFETIME_MINUTES = [
        'cashier' => 480, // 8 jam (1 shift kasir penuh) agar tidak ter-logout saat tutup/buka browser
        'warehouse' => 240,
        'treasurer' => 240,
        'admin' => 480,
        'supervisor' => 480,
        'owner' => 720,
    ];

    /**
     * Wali (guard 'guardian', T-096 Fase 16): 2 jam — CATATAN-
     * PERBAIKAN.md §Fase16, guard terpisah dari 'web' jadi tidak
     * punya role Spatie sama sekali.
     */
    private const GUARDIAN_LIFETIME_MINUTES = 120;

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user('guardian') !== null) {
            config(['session.lifetime' => self::GUARDIAN_LIFETIME_MINUTES]);

            return $next($request);
        }

        $role = $request->user()?->getRoleNames()->first();

        if ($role !== null && isset(self::LIFETIME_MINUTES[$role])) {
            config(['session.lifetime' => self::LIFETIME_MINUTES[$role]]);
        }

        return $next($request);
    }
}
