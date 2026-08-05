<?php

use App\Models\Guardian;
use App\Models\Member;
use App\Models\User;
use App\Notifications\SuspiciousForgotPasswordAttemptNotification;
use App\Services\GuardianPasswordResetService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/**
 * REVISI-R1-v2.md §8.1 — "Lupa Password" wali lewat pertanyaan
 * keamanan anak (NIS + nama lengkap + tanggal lahir), TANPA pernah
 * membocorkan nama anak yang dipilih sistem atau field mana yang
 * salah, dengan lockout 3x gagal/24 jam per nomor HP dan notifikasi
 * ke admin saat itu terjadi.
 */
function guardianWithChild(?string $phone = null): array
{
    $phone = $phone ?? '0819'.random_int(10000000, 99999999);
    $guardian = Guardian::create(['name' => 'Wali Lupa Password', 'phone' => $phone, 'password' => 'PasswordLama123', 'is_active' => true]);
    $member = Member::create([
        'member_number' => 'FGT'.random_int(10000, 99999),
        'name' => 'Anak Uji Lupa Password',
        'type' => 'santri',
        'status' => 'active',
        'nis' => '30012024',
        'birth_date' => '2010-05-15',
    ]);
    $guardian->members()->attach($member->id);

    return [$guardian, $member, $phone];
}

it('completes the full happy-path flow: phone -> correct answers -> new password -> auto login', function () {
    [$guardian, $member, $phone] = guardianWithChild();

    $phoneResponse = $this->post(route('wali.forgot-password.phone.store'), ['phone' => $phone]);
    $phoneResponse->assertRedirect();
    $token = Str::of($phoneResponse->headers->get('Location'))->after('token=')->toString();
    expect($token)->not->toBeEmpty();

    $verifyResponse = $this->post(route('wali.forgot-password.verify.store'), [
        'token' => $token,
        'nis' => '30012024',
        'full_name' => 'Anak Uji Lupa Password',
        'birth_date' => '2010-05-15',
    ]);
    $verifyResponse->assertRedirect();
    $verifiedToken = Str::of($verifyResponse->headers->get('Location'))->after('token=')->toString();
    expect($verifiedToken)->not->toBeEmpty();

    $this->post(route('wali.forgot-password.reset.store'), [
        'token' => $verifiedToken,
        'password' => 'PasswordBaruSekali123',
        'password_confirmation' => 'PasswordBaruSekali123',
    ])->assertRedirect(route('wali.dashboard'));

    $this->assertAuthenticatedAs($guardian->fresh(), 'guardian');
    expect(Hash::check('PasswordBaruSekali123', $guardian->fresh()->password))->toBeTrue();
});

it('gives the exact same generic error for a phone number that does not exist as for wrong answers', function () {
    $response1 = $this->post(route('wali.forgot-password.phone.store'), ['phone' => '089999999999']);
    $token1 = Str::of($response1->headers->get('Location'))->after('token=')->toString();

    $response2 = $this->post(route('wali.forgot-password.verify.store'), [
        'token' => $token1,
        'nis' => 'apa-saja',
        'full_name' => 'Siapa Saja',
        'birth_date' => '2000-01-01',
    ]);

    $response2->assertSessionHasErrors('nis');
    expect(session('errors')->get('nis')[0])->toBe('Data tidak cocok. Silakan coba lagi atau hubungi admin.');
});

it('rejects verification when only one of the three answers is wrong (no partial feedback)', function () {
    [$guardian, $member, $phone] = guardianWithChild();

    $response = $this->post(route('wali.forgot-password.phone.store'), ['phone' => $phone]);
    $token = Str::of($response->headers->get('Location'))->after('token=')->toString();

    $verify = $this->post(route('wali.forgot-password.verify.store'), [
        'token' => $token,
        'nis' => '30012024', // benar
        'full_name' => 'Anak Uji Lupa Password', // benar
        'birth_date' => '1999-01-01', // SALAH
    ]);

    $verify->assertSessionHasErrors('nis');
    expect(session('errors')->get('nis')[0])->toBe('Data tidak cocok. Silakan coba lagi atau hubungi admin.');
});

it('locks the phone number for 24 hours after 3 failed verification attempts and notifies admins', function () {
    Notification::fake();
    [$guardian, $member, $phone] = guardianWithChild();
    $service = app(GuardianPasswordResetService::class);

    for ($i = 0; $i < 3; $i++) {
        $token = $service->startChallenge($phone);
        $service->verifyAnswers($token, 'salah', 'salah', '2000-01-01');
    }

    expect($service->isLockedOut($phone))->toBeTrue();

    $owner = User::role('owner')->first();
    Notification::assertSentTo($owner, SuspiciousForgotPasswordAttemptNotification::class);
});

it('rejects a challenge for a locked-out phone number even with correct answers', function () {
    [$guardian, $member, $phone] = guardianWithChild();
    $service = app(GuardianPasswordResetService::class);

    for ($i = 0; $i < 3; $i++) {
        $token = $service->startChallenge($phone);
        $service->verifyAnswers($token, 'salah', 'salah', '2000-01-01');
    }

    $newToken = $service->startChallenge($phone);
    $result = $service->verifyAnswers($newToken, '30012024', 'Anak Uji Lupa Password', '2010-05-15');

    expect($result)->toBeNull();
});

it('rejects reusing an already-consumed verified token to reset the password twice', function () {
    [$guardian, $member, $phone] = guardianWithChild();
    $service = app(GuardianPasswordResetService::class);

    $token = $service->startChallenge($phone);
    $verifiedToken = $service->verifyAnswers($token, '30012024', 'Anak Uji Lupa Password', '2010-05-15');

    $first = $service->resetPassword($verifiedToken, 'PasswordPertama123');
    expect($first)->not->toBeNull();

    $second = $service->resetPassword($verifiedToken, 'PasswordKedua456');
    expect($second)->toBeNull();
});
