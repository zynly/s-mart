<?php

namespace App\Http\Controllers\Wali;

use App\Http\Controllers\Controller;
use App\Services\GuardianPasswordResetService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/**
 * REVISI-R1-v2.md §8.1 — "Lupa Password" wali lewat pertanyaan
 * keamanan (bukan email reset link — wali santri umumnya tidak
 * mendaftarkan email, hanya nomor HP). Pesan gagal SELALU generik di
 * SEMUA langkah — lihat GuardianPasswordResetService untuk alasan
 * anti-enumerasi lengkap.
 */
class ForgotPasswordController extends Controller
{
    public function __construct(private readonly GuardianPasswordResetService $service) {}

    public function showPhoneForm(): Response
    {
        return Inertia::render('Wali/Auth/ForgotPassword/Phone');
    }

    public function submitPhone(Request $request): RedirectResponse
    {
        $data = $request->validate(['phone' => ['required', 'string', 'max:20']]);

        if ($this->service->isLockedOut($data['phone'])) {
            // Pesan tetap generik (tidak bilang "dikunci") — beda pesan
            // untuk kasus terkunci vs nomor tidak ditemukan sama saja
            // membocorkan info valid/tidaknya nomor tsb.
            return back()->withErrors(['phone' => 'Data tidak cocok. Silakan coba lagi atau hubungi admin.']);
        }

        $token = $this->service->startChallenge($data['phone']);

        return redirect()->route('wali.forgot-password.verify', ['token' => $token]);
    }

    public function showVerifyForm(Request $request): Response
    {
        return Inertia::render('Wali/Auth/ForgotPassword/Verify', [
            'token' => $request->query('token', ''),
        ]);
    }

    public function submitVerify(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'nis' => ['required', 'string', 'max:30'],
            'full_name' => ['required', 'string', 'max:255'],
            'birth_date' => ['required', 'date'],
        ]);

        $verifiedToken = $this->service->verifyAnswers(
            $data['token'],
            $data['nis'],
            $data['full_name'],
            $data['birth_date'],
        );

        if ($verifiedToken === null) {
            // Netral — TIDAK menyebut field mana yang salah (lihat §8.1
            // "Yang TIDAK boleh terjadi").
            return back()->withErrors(['nis' => 'Data tidak cocok. Silakan coba lagi atau hubungi admin.']);
        }

        return redirect()->route('wali.forgot-password.reset', ['token' => $verifiedToken]);
    }

    public function showResetForm(Request $request): Response
    {
        return Inertia::render('Wali/Auth/ForgotPassword/Reset', [
            'token' => $request->query('token', ''),
        ]);
    }

    public function submitReset(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'password' => ['required', 'string', Password::default(), 'confirmed'],
        ]);

        $guardian = $this->service->resetPassword($data['token'], $data['password']);

        if ($guardian === null) {
            return redirect()->route('wali.forgot-password.phone')
                ->withErrors(['phone' => 'Sesi verifikasi sudah kedaluwarsa — mulai ulang dari awal.']);
        }

        Auth::guard('guardian')->login($guardian);
        $request->session()->regenerate();

        return redirect()->route('wali.dashboard')->with(
            'success',
            "Password berhasil diubah pada {$guardian->fresh()->updated_at->format('d-m-Y H:i')} dari IP {$request->ip()}.",
        );
    }
}
