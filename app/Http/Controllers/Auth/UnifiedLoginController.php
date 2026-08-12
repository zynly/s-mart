<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Single Portal Login Controller (Tanpa Tab).
 * Otomatis mendeteksi role kredensial (Staff / Admin / Kasir vs Wali Santri)
 * dan mengarahkan ke dashboard yang sesuai.
 */
class UnifiedLoginController extends Controller
{
    public function show(): Response|RedirectResponse
    {
        if (Auth::guard('web')->check()) {
            return redirect()->intended('/admin');
        }
        if (Auth::guard('guardian')->check()) {
            return redirect()->intended('/wali');
        }

        return Inertia::render('Auth/Login', [
            'status' => session('status'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $identity = trim((string) ($request->input('identity') ?? $request->input('username') ?? $request->input('phone') ?? ''));
        $password = (string) $request->input('password', '');
        $remember = $request->boolean('remember');

        if (empty($identity) || empty($password)) {
            throw ValidationException::withMessages([
                'identity' => 'Username, No. HP, atau password wajib diisi.',
            ]);
        }

        // 1. Coba autentikasi sebagai User / Staff / Admin / Kasir / Manager (Guard 'web')
        $userFields = ['username', 'email', 'phone'];
        foreach ($userFields as $field) {
            if (Auth::guard('web')->attempt([$field => $identity, 'password' => $password], $remember)) {
                $user = Auth::guard('web')->user();

                if (! $user->is_active) {
                    Auth::guard('web')->logout();
                    $request->session()->invalidate();
                    throw ValidationException::withMessages([
                        'identity' => 'Akun staf ini telah dinonaktifkan. Hubungi administrator.',
                    ]);
                }

                // Cek jika 2FA aktif untuk user ini
                if (method_exists($user, 'hasEnabledTwoFactorAuthentication') && $user->hasEnabledTwoFactorAuthentication()) {
                    Auth::guard('web')->logout();
                    $request->session()->put([
                        'login.id' => $user->getKey(),
                        'login.remember' => $remember,
                    ]);

                    return redirect()->route('two-factor.login');
                }

                $request->session()->regenerate();
                $user->forceFill([
                    'last_login_at' => now(),
                    'last_login_ip' => $request->ip(),
                    'last_login_user_agent' => substr((string) $request->userAgent(), 0, 500),
                ])->save();

                return redirect()->intended('/admin');
            }
        }

        // 2. Coba autentikasi sebagai Wali Santri (Guard 'guardian')
        $cleanPhone = preg_replace('/[^0-9]/', '', $identity);
        $phoneCandidates = array_unique(array_filter([
            $identity,
            $cleanPhone,
            str_starts_with($cleanPhone, '62') ? '0'.substr($cleanPhone, 2) : null,
            str_starts_with($cleanPhone, '0') ? '62'.substr($cleanPhone, 1) : null,
        ]));

        foreach ($phoneCandidates as $phone) {
            if (Auth::guard('guardian')->attempt(['phone' => $phone, 'password' => $password], $remember)) {
                $guardian = Auth::guard('guardian')->user();

                if (! $guardian->is_active) {
                    Auth::guard('guardian')->logout();
                    $request->session()->invalidate();
                    throw ValidationException::withMessages([
                        'identity' => 'Akun wali ini dinonaktifkan. Hubungi admin sekolah.',
                    ]);
                }

                $request->session()->regenerate();
                $guardian->forceFill(['last_login_at' => now()])->save();

                return redirect()->intended(route('wali.dashboard'));
            }
        }

        throw ValidationException::withMessages([
            'identity' => 'Username / Nomor HP atau password yang Anda masukkan salah.',
        ]);
    }
}
