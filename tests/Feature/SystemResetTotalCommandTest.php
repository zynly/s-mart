<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

/**
 * Gap G-04 (2026-08-03) — `system:reset-total` adalah satu-satunya jalur
 * reset TOTAL sistem (spec asli minta tombol web untuk ini, sengaja
 * TIDAK dibangun — lihat SystemResetController). Test ini HANYA
 * memverifikasi pagar konfirmasi berlapis & pembatasan environment
 * (jalur GAGAL) — jalur SUKSES sengaja tidak dieksekusi di sini karena
 * akan menjalankan `migrate:fresh` sungguhan dan merusak koneksi
 * database bersama yang dipakai seluruh test suite lain. Jalur sukses
 * diverifikasi manual di environment terisolasi (lihat panduan
 * verifikasi terpisah).
 */
it('refuses to run in production without --force', function () {
    app()->instance('env', 'production');

    $this->artisan('system:reset-total')->assertFailed();

    app()->instance('env', 'testing');

    expect(Activity::where('log_name', 'system')->where('description', 'like', 'Reset TOTAL sistem%')->exists())->toBeFalse();
});

it('aborts when the typed application name does not match', function () {
    $this->artisan('system:reset-total')
        ->expectsQuestion('Ketik nama aplikasi persis untuk melanjutkan ("'.config('app.name').'")', 'Nama Yang Salah')
        ->assertFailed();
});

it('aborts when the explicit confirmation is declined', function () {
    $this->artisan('system:reset-total')
        ->expectsQuestion('Ketik nama aplikasi persis untuk melanjutkan ("'.config('app.name').'")', config('app.name'))
        ->expectsConfirmation('Saya paham SELURUH data (termasuk akun pengguna & data master) akan hilang permanen. Lanjutkan?', 'no')
        ->assertFailed();
});

it('requires an additional exact phrase in production even with --force and correct name/confirmation', function () {
    app()->instance('env', 'production');

    $this->artisan('system:reset-total', ['--force' => true])
        ->expectsQuestion('Ketik nama aplikasi persis untuk melanjutkan ("'.config('app.name').'")', config('app.name'))
        ->expectsConfirmation('Saya paham SELURUH data (termasuk akun pengguna & data master) akan hilang permanen. Lanjutkan?', 'yes')
        ->expectsQuestion('Ini environment PRODUCTION. Ketik persis "RESET TOTAL PRODUKSI" untuk melanjutkan', 'frasa salah')
        ->assertFailed();

    app()->instance('env', 'testing');
});

it('does not log or proceed at all when the very first confirmation fails', function () {
    $before = Activity::count();

    $this->artisan('system:reset-total')
        ->expectsQuestion('Ketik nama aplikasi persis untuk melanjutkan ("'.config('app.name').'")', 'salah')
        ->assertFailed();

    expect(Activity::count())->toBe($before);
});
