<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Fase 18 (T-106). Content-Security-Policy sebelumnya SENGAJA ditunda
 * (lihat riwayat komentar ini) karena butuh nonce yang konsisten antara
 * header & skrip anti-FOUC inline di app.blade.php, plus pengujian
 * lintas-halaman menyeluruh — dua hal yang sekarang sudah dikerjakan.
 *
 * CSP hanya DITEGAKKAN saat `APP_ENV=production` (pola sama seperti
 * SESSION_SECURE_COOKIE/APP_DEBUG — fitur yang bisa mematikan app kalau
 * salah konfigurasi TIDAK aktif di dev/local secara default). Nonce
 * tetap di-generate di semua environment (murah, tidak berpengaruh
 * kalau CSP tidak ditegakkan) supaya perilaku app.blade.php konsisten.
 */
class SecurityHeaders
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $nonce = Str::random(24);
        View::share('cspNonce', $nonce);

        $response = $next($request);

        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        if ($request->secure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        // CSP_ENFORCE default ikut APP_ENV=production — override manual
        // dipakai untuk uji CSP di dev TANPA ikut memicu efek
        // SESSION_SECURE_COOKIE/APP_DEBUG production (yang butuh HTTPS
        // sungguhan, akan mematahkan login di http://s-mart.test).
        if (filter_var(env('CSP_ENFORCE', app()->environment('production')), FILTER_VALIDATE_BOOL)) {
            $response->headers->set('Content-Security-Policy', $this->buildCsp($nonce));
        }

        return $response;
    }

    /**
     * `style-src` sengaja ikut `'unsafe-inline'` — komponen Radix UI
     * (dasar shadcn/ui, dipakai luas di app ini: Dialog, Select,
     * DropdownMenu, dst) menyuntik `style` inline lewat JS DOM
     * manipulation untuk positioning popover/portal, BUKAN dari Blade,
     * jadi tidak bisa diberi nonce yang sama seperti skrip. Risiko CSS-
     * injection-jadi-XSS lewat celah ini secara praktis nihil di browser
     * modern (beda dengan script-src yang dijaga ketat pakai nonce).
     */
    private function buildCsp(string $nonce): string
    {
        return implode('; ', [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.midtrans.com https://app.sandbox.midtrans.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https://images.unsplash.com https://*.unsplash.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "connect-src 'self' https://app.pakasir.com https://app.midtrans.com https://app.sandbox.midtrans.com",
            "frame-src 'self' https://app.pakasir.com https://app.midtrans.com https://app.sandbox.midtrans.com",
            "frame-ancestors 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
        ]);
    }
}
