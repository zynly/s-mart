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
        $identity = trim((string) ($request->input('identity') ?? $request->input('phone') ?? $request->input('nis') ?? ''));
        $password = (string) $request->input('password', '');
        $remember = $request->boolean('remember');

        if (empty($identity) || empty($password)) {
            throw ValidationException::withMessages([
                'identity' => 'NIS Santri atau Nomor HP wajib diisi.',
            ]);
        }

        // 1. Cek via NIS Santri
        $member = \App\Models\Member::where('nis', $identity)
            ->orWhere('member_number', $identity)
            ->first();

        if ($member) {
            $guardian = $member->guardians()
                ->orderByDesc('guardian_member.is_primary')
                ->first();

            if (! $guardian) {
                $guardianPhone = $member->guardian_phone ?: ('NIS-' . $member->nis);
                $guardian = \App\Models\Guardian::firstOrCreate(
                    ['phone' => $guardianPhone],
                    [
                        'name' => $member->guardian_name ?: ('Wali dari ' . $member->name),
                        'password' => '123456',
                        'relation' => $member->guardian_relation ?: 'Wali',
                        'is_active' => true,
                    ]
                );

                if (! $member->guardians()->where('guardians.id', $guardian->id)->exists()) {
                    $member->guardians()->attach($guardian->id, [
                        'is_primary' => true,
                        'consent_given_at' => now(),
                    ]);
                }
            }

            if ($guardian && \Illuminate\Support\Facades\Hash::check($password, $guardian->password)) {
                if (! $guardian->is_active) {
                    throw ValidationException::withMessages([
                        'identity' => 'Akun wali santri ini dinonaktifkan. Hubungi admin sekolah.',
                    ]);
                }

                Auth::guard('guardian')->login($guardian, $remember);
                $request->session()->regenerate();
                $guardian->forceFill(['last_login_at' => now()])->save();

                return redirect()->intended(route('wali.dashboard'));
            }
        }

        // 2. Cek via Nomor HP Wali
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
            'identity' => 'NIS Santri / Nomor HP atau password salah.',
        ]);
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::guard('guardian')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('wali.login');
    }
}
