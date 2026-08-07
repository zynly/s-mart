<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class RoleSwitchController extends Controller
{
    // Available roles owner can switch to for testing
    private const SWITCHABLE_ROLES = [
        'admin'      => ['label' => 'Admin',           'color' => 'blue',   'icon' => 'ShieldCheck'],
        'supervisor' => ['label' => 'Supervisor',      'color' => 'violet', 'icon' => 'Eye'],
        'cashier'    => ['label' => 'Kasir',           'color' => 'emerald','icon' => 'ShoppingCart'],
        'warehouse'  => ['label' => 'Gudang',          'color' => 'orange', 'icon' => 'Boxes'],
        'treasurer'  => ['label' => 'Bendahara',       'color' => 'amber',  'icon' => 'BookOpen'],
    ];

    /**
     * Return the list of switchable roles (JSON for modal).
     */
    public function roles(Request $request)
    {
        if (! $request->user('web')?->hasRole('owner')) {
            abort(403, 'Hanya owner yang dapat mengakses fitur ini.');
        }

        return response()->json([
            'roles' => self::SWITCHABLE_ROLES,
        ]);
    }

    /**
     * Verify PIN and store masquerade role in session.
     */
    public function switchRole(Request $request)
    {
        $user = $request->user('web');

        if (! $user?->hasRole('owner')) {
            abort(403, 'Hanya owner yang dapat mengakses fitur ini.');
        }

        $request->validate([
            'role' => ['required', 'string', 'in:' . implode(',', array_keys(self::SWITCHABLE_ROLES))],
            'pin'  => ['required', 'string', 'min:6', 'max:6'],
        ]);

        // Verify PIN against owner's hashed pin
        if (! Hash::check($request->pin, $user->pin)) {
            return back()->withErrors(['pin' => 'PIN tidak valid. Periksa kembali.']);
        }

        // Store masquerade in session
        $request->session()->put('masquerade_role', $request->role);
        $request->session()->put('masquerade_label', self::SWITCHABLE_ROLES[$request->role]['label']);

        return redirect()->route('admin.dashboard')->with('success', 'Beralih ke role ' . self::SWITCHABLE_ROLES[$request->role]['label'] . ' berhasil.');
    }

    /**
     * Exit masquerade, restore owner session.
     */
    public function exitSwitch(Request $request)
    {
        $request->session()->forget(['masquerade_role', 'masquerade_label']);

        return redirect()->route('admin.dashboard')->with('success', 'Kembali ke mode Owner.');
    }

    /**
     * Owner enters Wali portal in preview mode.
     * Logs owner into guardian guard as a demo guardian.
     */
    public function enterWaliPreview(Request $request)
    {
        $user = $request->user('web');

        if (! $user?->hasRole('owner')) {
            abort(403, 'Hanya owner yang dapat mengakses fitur ini.');
        }

        $request->validate([
            'pin' => ['required', 'string', 'min:6', 'max:6'],
        ]);

        if (! \Illuminate\Support\Facades\Hash::check($request->pin, $user->pin)) {
            return back()->withErrors(['pin' => 'PIN tidak valid. Periksa kembali.']);
        }

        // Find or use the first demo guardian (phone: 000000000000)
        $demoGuardian = \App\Models\Guardian::where('phone', '000000000000')->first();

        if (! $demoGuardian) {
            return back()->withErrors(['pin' => 'Guardian demo tidak ditemukan. Jalankan seeder terlebih dahulu.']);
        }

        // Log owner into the guardian guard as demo guardian
        auth('guardian')->login($demoGuardian);

        // Store flag so wali portal knows this is owner preview mode
        $request->session()->put('owner_wali_preview', true);

        return redirect()->route('wali.dashboard');
    }

    /**
     * Exit wali preview, return to admin dashboard.
     */
    public function exitWaliPreview(Request $request)
    {
        auth('guardian')->logout();
        $request->session()->forget('owner_wali_preview');

        return redirect()->route('admin.dashboard')->with('success', 'Keluar dari Portal Wali.');
    }
}
