<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\Member;
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

        $member->guardians()->attach($guardian->id, ['is_primary' => $request->boolean('is_primary')]);

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

    public function resetPassword(Guardian $guardian): RedirectResponse
    {
        $newPassword = Str::random(10);
        $guardian->forceFill(['password' => $newPassword])->save();

        return back()->with('success', "Password wali {$guardian->name} direset ke: {$newPassword}");
    }

    public function toggleActive(Guardian $guardian): RedirectResponse
    {
        $guardian->update(['is_active' => ! $guardian->is_active]);

        return back()->with('success', $guardian->is_active ? "Akun wali {$guardian->name} diaktifkan." : "Akun wali {$guardian->name} dinonaktifkan.");
    }
}
