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
        $credentials = $request->validate([
            'identity' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $identity = trim($credentials['identity']);
        $password = $credentials['password'];
        $remember = $request->boolean('remember');

        // 1. Coba autentikasi sebagai User / Staff / Admin / Kasir / Manager (Guard 'web')
        $userFields = ['username', 'email', 'phone'];
        foreach ($userFields as $field) {
            if (Auth::guard('web')->attempt([$field => $identity, 'password' => $password], $remember)) {
                $request->session()->regenerate();
                $user = Auth::guard('web')->user();

                if (! $user->is_active) {
                    Auth::guard('web')->logout();
                    $request->session()->invalidate();
                    throw ValidationException::withMessages([
                        'identity' => 'Akun staf ini telah dinonaktifkan. Hubungi administrator.',
                    ]);
                }

                return redirect()->intended('/admin');
            }
        }

        // 2. Coba autentikasi sebagai Wali Santri (Guard 'guardian')
        $cleanPhone = preg_replace('/[^0-9]/', '', $identity);
        $phoneCandidates = array_unique(array_filter([$identity, $cleanPhone]));

        foreach ($phoneCandidates as $phone) {
            if (Auth::guard('guardian')->attempt(['phone' => $phone, 'password' => $password], $remember)) {
                $request->session()->regenerate();
                $guardian = Auth::guard('guardian')->user();

                if (! $guardian->is_active) {
                    Auth::guard('guardian')->logout();
                    $request->session()->invalidate();
                    throw ValidationException::withMessages([
                        'identity' => 'Akun wali ini dinonaktifkan. Hubungi admin sekolah.',
                    ]);
                }

                $guardian->forceFill(['last_login_at' => now()])->save();

                return redirect()->intended(route('wali.dashboard'));
            }
        }

        throw ValidationException::withMessages([
            'identity' => 'Username / Nomor HP atau password yang Anda masukkan salah.',
        ]);
    }
}
