<?php

use App\Models\User;
use App\Services\AuthorizationService;
use App\Services\SettingsOverrideService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

/**
 * Gap G-03 (2026-08-03) — `pin_override_ttl_minutes` (masa berlaku token
 * approval PIN supervisor, AuthorizationService::issueToken()) sebelumnya
 * hanya bisa diubah lewat config/server, tidak ada field di halaman
 * Pengaturan. Ditambahkan ke tab "Deposit & PIN" (SettingController::tabs())
 * — memakai infrastruktur generik yang sudah ada (Settings/Index.tsx
 * merender field dari metadata backend, SettingsOverrideService menimpakan
 * nilai tersimpan ke config('pos.*') yang sudah dipakai issueToken()).
 */
it('allows owner/admin to update the PIN override TTL within a safe range, and it takes effect on config()', function () {
    $admin = User::role('admin')->firstOrFail();

    $this->actingAs($admin)
        ->put(route('admin.settings.update', 'deposit'), ['pin_override_ttl_minutes' => 10])
        ->assertSessionDoesntHaveErrors()
        ->assertRedirect();

    // Simulasikan request BERIKUTNYA (SettingsOverrideService::apply()
    // dipanggil di AppServiceProvider::boot(), sekali per proses/request
    // sungguhan — di test yang sama, panggil ulang manual untuk
    // memverifikasi override benar-benar tersambung ke config('pos.*')
    // yang dipakai issueToken()).
    SettingsOverrideService::forget();
    SettingsOverrideService::apply();

    expect((int) config('pos.pin_override_ttl_minutes'))->toBe(10);
});

it('rejects a PIN override TTL outside the safe range (below 1 or above 15 minutes)', function () {
    $admin = User::role('admin')->firstOrFail();

    $this->actingAs($admin)
        ->put(route('admin.settings.update', 'deposit'), ['pin_override_ttl_minutes' => 0])
        ->assertSessionHasErrors('pin_override_ttl_minutes');

    $this->actingAs($admin)
        ->put(route('admin.settings.update', 'deposit'), ['pin_override_ttl_minutes' => 16])
        ->assertSessionHasErrors('pin_override_ttl_minutes');
});

it('blocks a role without setting.update from changing the PIN override TTL', function () {
    $supervisor = User::role('supervisor')->firstOrFail();

    $this->actingAs($supervisor)
        ->put(route('admin.settings.update', 'deposit'), ['pin_override_ttl_minutes' => 10])
        ->assertForbidden();
});

it('logs the change to the activity log', function () {
    $owner = User::role('owner')->firstOrFail();

    $this->actingAs($owner)
        ->put(route('admin.settings.update', 'deposit'), ['pin_override_ttl_minutes' => 5]);

    expect(Activity::where('log_name', 'Setting')->latest('id')->first())->not->toBeNull();
});

it('actually extends how long an approval token stays valid once the effective TTL is raised', function () {
    $owner = User::role('owner')->firstOrFail();
    $supervisor = User::role('supervisor')->firstOrFail();

    $this->actingAs($owner)->put(route('admin.settings.update', 'deposit'), ['pin_override_ttl_minutes' => 10]);
    SettingsOverrideService::forget();
    SettingsOverrideService::apply();

    $token = app(AuthorizationService::class)->issueToken($supervisor, 'sale.void');

    // 8 menit kemudian: melewati default lama (2 menit), tapi masih dalam TTL baru (10 menit).
    $this->travel(8)->minutes();

    $approver = app(AuthorizationService::class)->consumeToken($token, 'sale.void');
    expect($approver?->id)->toBe($supervisor->id);
});

it('falls back to a safe default TTL when no override has ever been saved', function () {
    SettingsOverrideService::forget();
    SettingsOverrideService::apply();

    expect((int) config('pos.pin_override_ttl_minutes'))->toBe(2);
});
