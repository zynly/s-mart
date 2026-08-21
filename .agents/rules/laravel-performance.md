# LARAVEL PERFORMANCE OPTIMIZATION RULES (10 ATURAN WAJIB)

1. **Rule #1 — Cache Route**: `php artisan route:cache` (tanpa Closure di route).
2. **Rule #2 — Cache Config**: `php artisan config:cache` (env() hanya di config/*.php).
3. **Rule #3 — Optimalkan Autoloader Composer**: `composer install --optimize-autoloader --no-dev`.
4. **Rule #4 — Eager Loading (Cegah N+1 Query)**: Wajib `with()`, `load()`, atau `withCount()`.
5. **Rule #5 — Gunakan Queue untuk Proses Berat**: Pindahkan logic lambat ke Job Queue.
6. **Rule #6 — Cache Hasil Query**: Bungkus dengan `Cache::remember()`.
7. **Rule #7 — Database Indexing**: Kolom WHERE/JOIN/ORDER BY wajib berindeks.
8. **Rule #8 — Kompres & Minify Asset**: Jalankan `pnpm build`.
9. **Rule #9 — Aktifkan OPcache**: Pastikan opcache.enable=1 pada server.
10. **Rule #10 — Driver Cache & Session Cepat**: Prioritaskan Redis/Memcached.
