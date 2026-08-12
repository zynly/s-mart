<?php

namespace App\Http\Controllers\Wali;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * T-096 (Fase 16). TIDAK lewat Fortify — Fortify terikat guard 'web'
 * saja (config/fortify.php: 'guard' => 'web'), Portal Wali pakai guard
 * 'guardian' terpisah, jadi login/logout ditulis manual di sini.
 */
class AuthController extends Controller
{
    public function showLogin(Request $request): Response
    {
        return Inertia::render('Auth/Login', [
            'defaultTab' => 'wali',
        ]);
    }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'phone' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::guard('guardian')->attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'phone' => 'Nomor HP atau password salah.',
            ]);
        }

        $request->session()->regenerate();

        $guardian = Auth::guard('guardian')->user();

        if (! $guardian->is_active) {
            Auth::guard('guardian')->logout();
            $request->session()->invalidate();

            throw ValidationException::withMessages([
                'phone' => 'Akun wali ini dinonaktifkan. Hubungi admin sekolah.',
            ]);
        }

        $guardian->forceFill(['last_login_at' => now()])->save();

        return redirect()->intended(route('wali.dashboard'));
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::guard('guardian')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('wali.login');
    }
}
