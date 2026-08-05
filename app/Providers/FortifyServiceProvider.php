<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Actions\Fortify\UpdateUserPassword;
use App\Actions\Fortify\UpdateUserProfileInformation;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Fortify\Actions\RedirectIfTwoFactorAuthenticatable;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::updateUserProfileInformationUsing(UpdateUserProfileInformation::class);
        Fortify::updateUserPasswordsUsing(UpdateUserPassword::class);
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::redirectUserForTwoFactorAuthenticationUsing(RedirectIfTwoFactorAuthenticatable::class);

        Fortify::loginView(fn () => Inertia::render('Auth/Login'));
        Fortify::requestPasswordResetLinkView(fn () => Inertia::render('Auth/ForgotPassword'));
        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('Auth/ResetPassword', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]));
        // T-106: dua view ini TIDAK PERNAH didaftarkan meski
        // twoFactorAuthentication(['confirmPassword' => true]) sudah
        // aktif sejak awal — tanpanya, mengaktifkan/mengelola 2FA
        // (butuh konfirmasi password ulang) dan login sebagai user
        // ber-2FA (butuh tantangan kode) sama-sama menabrak halaman
        // yang tidak pernah ada.
        Fortify::confirmPasswordView(fn () => Inertia::render('Auth/ConfirmPassword'));
        Fortify::twoFactorChallengeView(fn () => Inertia::render('Auth/TwoFactorChallenge'));

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });

        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('passkeys', function (Request $request) {
            $credentialId = $request->input('credential.id');

            return Limit::perMinute(10)->by(
                ($credentialId ?: $request->session()->getId()).'|'.$request->ip()
            );
        });

        // Disiapkan untuk login Portal Wali (Fase 16, T-096) — 5x/menit per
        // nomor HP, bukan per IP (wali sekeluarga bisa berbagi jaringan/HP).
        RateLimiter::for('wali-login', function (Request $request) {
            return Limit::perMinute(5)->by(Str::transliterate(Str::lower((string) $request->input('phone'))));
        });

        // Gap G-09: ganti password mandiri Portal Wali — dikunci ke
        // guardian yang sedang login (bukan sekadar IP) supaya satu wali
        // tidak bisa dibrute-force lewat jaringan publik/warnet bersama
        // dari sesi wali LAIN, sama pola dengan
        // AuthorizationService::throttleKey() untuk PIN staf.
        RateLimiter::for('wali-password-change', function (Request $request) {
            $key = $request->user('guardian')?->id ?? $request->ip();

            return Limit::perMinute(5)->by("wali-password-change:{$key}");
        });

        // Rate limit route password.email/password.update (Fortify TIDAK
        // mendaftarkan throttle untuk keduanya sama sekali, beda dari
        // login/two-factor/passkeys di atas) ada di
        // App\Http\Middleware\ThrottlePasswordReset — bukan lewat
        // RateLimiter::for() seperti limiter lain di sini, karena Fortify
        // tidak menyediakan hook config('fortify.limiters.*') untuk
        // password reset. Middleware itu dipasang global (bootstrap/
        // app.php), memeriksa nama route sendiri di handle().
    }
}
