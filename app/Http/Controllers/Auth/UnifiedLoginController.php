<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Single Portal Login Controller (Tanpa Tab).
 * Otomatis mendeteksi role kredensial:
 * - Staff / Admin / Kasir / Manager (Username / No. HP / Email)
 * - Wali Santri (NIS Santri atau Nomor HP Wali)
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
                'identity' => 'NIS Santri, Username, atau password wajib diisi.',
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

        // 2. Coba autentikasi Wali Santri via NIS Santri
        $member = Member::where('nis', $identity)
            ->orWhere('member_number', $identity)
            ->first();

        if ($member) {
            // Cari wali yang sudah terhubung ke santri ini
            $guardian = $member->guardians()
                ->orderByDesc('guardian_member.is_primary')
                ->first();

            // Jika belum ada akun wali terhubung, auto-provision akun wali dengan password default 123456
            if (! $guardian) {
                $guardianPhone = $member->guardian_phone ?: ('NIS-' . $member->nis);
                $guardian = Guardian::firstOrCreate(
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

            if ($guardian && Hash::check($password, $guardian->password)) {
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

        // 3. Coba autentikasi sebagai Wali Santri via Nomor HP (Guard 'guardian')
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
            'identity' => 'NIS Santri / Username / No. HP atau password yang Anda masukkan salah.',
        ]);
    }
}
