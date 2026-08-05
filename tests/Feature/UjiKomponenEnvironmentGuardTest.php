<?php

use Illuminate\Support\Facades\Route;

/**
 * Gap G-10 (2026-08-03) — verifikasi ulang: `/uji-komponen`
 * (routes/web.php) dulunya terdaftar tanpa guard sama sekali (publik di
 * produksi, membocorkan peta komponen internal). Sudah diperbaiki
 * dengan membungkus PENDAFTARAN rute-nya sendiri dalam
 * `if (app()->environment('local'))` — bukan middleware/otorisasi di
 * dalam handler, tapi rute itu SENDIRI tidak pernah ada di luar local.
 * Ditandai SELESAI (bukan gap terbuka) — test ini murni regression guard
 * supaya perbaikan ini tidak sengaja terlepas lagi di kemudian hari.
 */
it('does not register the /uji-komponen route outside the local environment', function () {
    // Test suite berjalan di environment "testing" (phpunit.xml), bukan
    // "local" — kondisi yang sama persis dengan produksi untuk rute ini.
    expect(app()->environment('local'))->toBeFalse();

    $this->get('/uji-komponen')->assertNotFound();
});

it('cannot be reached via a query parameter, header, or any other request trick', function () {
    $this->get('/uji-komponen?env=local')->assertNotFound();
    $this->get('/uji-komponen', ['X-Environment' => 'local', 'X-Forwarded-Env' => 'local'])->assertNotFound();
    $this->post('/uji-komponen')->assertNotFound();
});

it('has no named route pointing to it at all outside local (nothing to leak via route:list/route model binding)', function () {
    expect(Route::has('uji-komponen'))->toBeFalse();

    $matching = collect(Route::getRoutes())->first(fn ($route) => str_contains($route->uri(), 'uji-komponen'));
    expect($matching)->toBeNull();
});
