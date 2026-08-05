<?php

namespace App\Http\Controllers\Wali;

use App\Http\Controllers\Controller;
use App\Models\NotificationSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    public function edit(Request $request): Response
    {
        $guardian = $request->user('guardian');
        $setting = $guardian->notificationSetting ?? NotificationSetting::create(['guardian_id' => $guardian->id]);

        return Inertia::render('Wali/Settings/Edit', [
            'setting' => $setting->only('low_balance_alert', 'low_balance_threshold', 'weekly_summary', 'transaction_alert'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $guardian = $request->user('guardian');

        $data = $request->validate([
            'low_balance_alert' => ['required', 'boolean'],
            'low_balance_threshold' => ['required', 'integer', 'min:0'],
            'weekly_summary' => ['required', 'boolean'],
            'transaction_alert' => ['required', 'boolean'],
        ]);

        $setting = $guardian->notificationSetting ?? new NotificationSetting(['guardian_id' => $guardian->id]);
        $setting->fill($data)->save();

        return back()->with('success', 'Pengaturan notifikasi disimpan.');
    }

    /**
     * Gap G-09: sebelumnya satu-satunya jalur ganti password wali adalah
     * admin (GuardianController::resetPassword()) — wali tidak bisa
     * menggantinya sendiri sama sekali.
     */
    public function updatePassword(Request $request): RedirectResponse
    {
        $guardian = $request->user('guardian');

        $data = $request->validate([
            'current_password' => ['required', 'string', 'current_password:guardian'],
            'password' => ['required', 'string', Password::default(), 'confirmed'],
        ]);

        // Sebelum password diganti — mencabut sesi wali di perangkat LAIN
        // (butuh SESSION_DRIVER=database + middleware 'auth.session' di
        // routes/wali.php, lihat catatan di sana; logoutOtherDevices()
        // memverifikasi ulang $data['current_password'] sebelum
        // mencabut). Sesi yang sedang dipakai request ini sendiri TIDAK
        // ikut tercabut.
        Auth::guard('guardian')->logoutOtherDevices($data['current_password']);

        $guardian->forceFill(['password' => $data['password']])->save();

        // LogsActivityCustom::logExcept(['password', ...]) membuat log
        // otomatis model KOSONG untuk perubahan ini (satu-satunya field
        // yang berubah justru dikecualikan) — dicatat eksplisit di sini
        // supaya tetap ada jejak audit "password diganti", tanpa nilainya.
        activity('security')
            ->causedBy($guardian)
            ->withProperties(['guardian_id' => $guardian->id, 'guardian_name' => $guardian->name, 'self_service' => true])
            ->log("Wali {$guardian->name} mengganti password sendiri");

        return back()->with('success', 'Password berhasil diganti. Perangkat lain yang sedang login akan otomatis keluar.');
    }
}
