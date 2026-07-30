<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdjustSessionLifetime
{
    /**
     * Timeout per role dalam menit (CATATAN-PERBAIKAN.md § Fase 1).
     * Wali (guardian) belum jadi model User — diatur terpisah di Fase 16.
     *
     * @var array<string, int>
     */
    private const LIFETIME_MINUTES = [
        'cashier' => 30,
        'warehouse' => 60,
        'treasurer' => 120,
        'admin' => 120,
        'supervisor' => 120,
        'owner' => 480,
    ];

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $role = $request->user()?->getRoleNames()->first();

        if ($role !== null && isset(self::LIFETIME_MINUTES[$role])) {
            config(['session.lifetime' => self::LIFETIME_MINUTES[$role]]);
        }

        return $next($request);
    }
}
