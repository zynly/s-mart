<?php

use App\Models\Guardian;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

/**
 * Gap G-09 (2026-08-03) — sebelumnya satu-satunya jalur ganti password
 * wali adalah admin (GuardianController::resetPassword()); tidak ada
 * fitur mandiri sama sekali. Ditambahkan PUT /wali/akun/password
 * (SettingController::updatePassword()) dengan verifikasi password lama
 * (current_password:guardian), kebijakan password standar aplikasi
 * (Password::default()), rate limit per-guardian (RateLimiter::for(
 * 'wali-password-change')), dan Auth::guard('guardian')::
 * logoutOtherDeviceSessions() untuk mencabut sesi di perangkat lain.
 */
function guardianWithPassword(string $password = 'PasswordLama123'): Guardian
{
    return Guardian::create([
        'name' => 'Wali Uji',
        'phone' => '0812'.random_int(10000000, 99999999),
        'password' => $password,
        'is_active' => true,
    ]);
}

it('allows a guardian to change their own password with the correct current password', function () {
    $guardian = guardianWithPassword('PasswordLama123');

    $this->actingAs($guardian, 'guardian')
        ->put(route('wali.settings.password'), [
            'current_password' => 'PasswordLama123',
            'password' => 'PasswordBaru456',
            'password_confirmation' => 'PasswordBaru456',
        ])
        ->assertSessionDoesntHaveErrors()
        ->assertRedirect();

    expect(Hash::check('PasswordBaru456', $guardian->fresh()->password))->toBeTrue();
});

it('rejects the change when the current password is wrong', function () {
    $guardian = guardianWithPassword('PasswordLama123');

    $this->actingAs($guardian, 'guardian')
        ->put(route('wali.settings.password'), [
            'current_password' => 'password-yang-salah',
            'password' => 'PasswordBaru456',
            'password_confirmation' => 'PasswordBaru456',
        ])
        ->assertSessionHasErrors('current_password');

    expect(Hash::check('PasswordLama123', $guardian->fresh()->password))->toBeTrue();
});

it('rejects a weak new password and a mismatched confirmation', function () {
    $guardian = guardianWithPassword('PasswordLama123');

    $this->actingAs($guardian, 'guardian')
        ->put(route('wali.settings.password'), [
            'current_password' => 'PasswordLama123',
            'password' => '123',
            'password_confirmation' => '123',
        ])
        ->assertSessionHasErrors('password');

    $this->actingAs($guardian, 'guardian')
        ->put(route('wali.settings.password'), [
            'current_password' => 'PasswordLama123',
            'password' => 'PasswordBaru456',
            'password_confirmation' => 'tidak-cocok',
        ])
        ->assertSessionHasErrors('password');
});

it('logs the self-service password change to the activity log without leaking the password value', function () {
    $guardian = guardianWithPassword('PasswordLama123');

    $this->actingAs($guardian, 'guardian')
        ->put(route('wali.settings.password'), [
            'current_password' => 'PasswordLama123',
            'password' => 'PasswordBaru456',
            'password_confirmation' => 'PasswordBaru456',
        ]);

    $log = Activity::where('log_name', 'security')->latest('id')->first();
    expect($log)->not->toBeNull()
        ->and($log->causer_id)->toBe($guardian->id)
        ->and(json_encode($log->properties))->not->toContain('PasswordBaru456')
        ->and(json_encode($log->properties))->not->toContain('PasswordLama123');
});

it('throttles repeated password-change attempts per guardian', function () {
    $guardian = guardianWithPassword('PasswordLama123');
    RateLimiter::clear('wali-password-change:'.$guardian->id);

    for ($i = 0; $i < 5; $i++) {
        $this->actingAs($guardian, 'guardian')->put(route('wali.settings.password'), [
            'current_password' => 'salah-terus',
            'password' => 'PasswordBaru456',
            'password_confirmation' => 'PasswordBaru456',
        ]);
    }

    $this->actingAs($guardian, 'guardian')
        ->put(route('wali.settings.password'), [
            'current_password' => 'salah-terus',
            'password' => 'PasswordBaru456',
            'password_confirmation' => 'PasswordBaru456',
        ])
        ->assertStatus(429);
});
