<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Wajibkan header X-Idempotency-Key pada endpoint tulis kritis. Daftar
 * endpoint yang wajib memakai ini ada di CATATAN-PERBAIKAN.md §
 * "Perbaikan Lintas-Fase" — diterapkan per rute saat fase pemiliknya
 * dibangun (mis. /pos/complete di T-051, /admin/deposit/topup di T-026).
 */
class EnsureIdempotencyKey
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->hasHeader('X-Idempotency-Key')) {
            abort(400, 'Header X-Idempotency-Key wajib disertakan untuk operasi ini.');
        }

        return $next($request);
    }
}
