<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Fase 18 (temuan audit lintas-fase, T-106): tidak ada satu pun header
 * keamanan terpasang sebelum ini. Header "aman" (tidak mungkin merusak
 * apa pun) dipasang di sini. Content-Security-Policy SENGAJA TIDAK
 * disertakan — CSP yang salah konfigurasi bisa mematikan seluruh app
 * (skrip anti-FOUC inline di app.blade.php, Vite dev assets, dst),
 * risikonya lebih besar dari manfaat buru-buru pasang tanpa pengujian
 * menyeluruh lintas halaman. Ditunda ke Fase 18 penuh (T-106) yang
 * punya ruang untuk diuji dengan benar, bukan ditambal cepat di sini.
 */
class SecurityHeaders
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        if ($request->secure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
