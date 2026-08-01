<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\Member;
use App\Services\GuardianNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * T-095/T-096 (Fase 16). Gap yang tidak ditulis eksplisit di spec
 * (T-095..T-100 sama sekali tidak menyebut "admin kelola akun wali")
 * tapi wajib ada — tanpa ini tidak ada cara membuat akun Guardian
 * sama sekali. Digabung ke modul Anggota (bukan modul permission
 * baru) karena ini murni sub-fitur kelola anggota — gate pakai
 * `member.update` yang sudah ada.
 */
class GuardianController extends Controller
{
    public function __construct(private readonly GuardianNotificationService $notificationService) {}

    public function store(Request $request, Member $member): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:20'],
            'relation' => ['nullable', 'string', 'max:50'],
            'is_primary' => ['boolean'],
        ]);

        $guardian = Guardian::where('phone', $data['phone'])->first();
        $isNew = $guardian === null;
        $generatedPassword = null;

        if ($isNew) {
            $generatedPassword = Str::random(10);
            $guardian = Guardian::create([
                'name' => $data['name'],
                'phone' => $data['phone'],
                'relation' => $data['relation'] ?? null,
                'password' => $generatedPassword,
                'is_active' => true,
            ]);
        }

        if ($member->guardians()->where('guardians.id', $guardian->id)->exists()) {
            return back()->with('error', 'Wali dengan nomor HP ini sudah terhubung ke anggota ini.');
        }

        // Fase 17-Darurat (UU PDP 27/2022): representasi consent
        // terdokumentasi — akun wali dibuat ADMIN (bukan self-
        // registrasi wali), jadi ini timestamp linking oleh admin,
        // bukan tanda tangan digital consent eksplisit dari wali
        // sendiri. Dicatat apa adanya, bukan dipalsukan sebagai
        // consent penuh secara hukum.
        $member->guardians()->attach($guardian->id, [
            'is_primary' => $request->boolean('is_primary'),
            'consent_given_at' => now(),
        ]);

        // Bug nyata: tanpa ini admin tidak pernah tahu password awal yang
        // digenerate untuk akun wali baru — tidak ada jalan lain untuk
        // menyampaikannya ke orang tua.
        return back()->with('success', $isNew
            ? "Akun wali {$guardian->name} dibuat dan dihubungkan ke {$member->name}. Password awal: {$generatedPassword}"
            : "Wali {$guardian->name} (sudah punya akun) dihubungkan ke {$member->name}.");
    }

    public function destroy(Member $member, Guardian $guardian): RedirectResponse
    {
        $member->guardians()->detach($guardian->id);

        return back()->with('success', "Wali {$guardian->name} dilepas dari {$member->name}.");
    }

    public function resetPassword(Request $request, Guardian $guardian): RedirectResponse
    {
        $newPassword = Str::random(10);
        $guardian->forceFill(['password' => $newPassword])->save();

        // Temuan audit keamanan (Phase B): wali sekarang selalu dikabari
        // (kanal WA yang sama seperti notifikasi lain) supaya reset yang
        // bukan permintaannya sendiri tidak lolos tanpa jejak baginya.
        // Dicatat eksplisit dengan aktor & target — beda dari log
        // "updated Guardian" generik yang tidak jelas menyebut ini reset
        // password.
        $this->notificationService->passwordReset($guardian);

        activity('security')
            ->causedBy($request->user())
            ->withProperties(['guardian_id' => $guardian->id, 'guardian_name' => $guardian->name])
            ->log("Password wali {$guardian->name} direset oleh {$request->user()->name}");

        return back()->with('success', "Password wali {$guardian->name} direset ke: {$newPassword}");
    }

    public function toggleActive(Guardian $guardian): RedirectResponse
    {
        $guardian->update(['is_active' => ! $guardian->is_active]);

        return back()->with('success', $guardian->is_active ? "Akun wali {$guardian->name} diaktifkan." : "Akun wali {$guardian->name} dinonaktifkan.");
    }
}
