<?php

namespace App\Http\Middleware;

use App\Services\NavigationService;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        // T-096 (Fase 16): eksplisit guard 'web' — sejak guard 'guardian'
        // ada, $request->user() (guard default) bisa resolve ke instance
        // Guardian saat request datang lewat sesi wali, meledak di
        // ->getRoleNames() (method Spatie, tidak ada di model Guardian).
        // Bug nyata ditemukan lewat 500 error saat verifikasi Playwright.
        $user = $request->user('web');
        $guardian = $request->user('guardian');

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    ...$user->only('id', 'name', 'username', 'email', 'avatar'),
                    'roles' => $user->getRoleNames(),
                    'permissions' => $user->getAllPermissions()->pluck('name'),
                ] : null,
            ],
            // T-096 (Fase 16): identitas wali di guard terpisah — dibaca
            // WaliLayout, TIDAK dicampur ke 'auth.user' (guard 'web').
            'guardianAuth' => [
                'guardian' => $guardian ? $guardian->only('id', 'name', 'phone') : null,
            ],
            // fase-16-v2.md §8-9 — badge lonceng notifikasi wali, pola
            // sama dengan 'unreadNotificationsCount' admin (T-094) tapi
            // dihitung dari guard 'guardian' terpisah.
            'guardianUnreadNotificationsCount' => fn () => $guardian ? $guardian->unreadNotifications()->count() : 0,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
                'completed_sale_id' => fn () => $request->session()->get('completed_sale_id'),
                'completed_sale_ref' => fn () => $request->session()->get('completed_sale_ref'),
            ],
            'status' => fn () => $request->session()->get('status'),
            // Audit Fase 1: sebelumnya membagikan approver->id MENTAH —
            // endpoint aksi mempercayainya begitu saja tanpa bukti PIN
            // pernah diverifikasi (Temuan Kritis #1). AuthorizationOverrideController
            // sekarang men-flash TOKEN sekali-pakai (AuthorizationService::
            // issueToken()), bukan ID — SupervisorPinDialog membacanya dari
            // sini dan endpoint aksi wajib menukarnya lewat consumeToken().
            'overrideToken' => fn () => $request->session()->get('overrideToken'),
            // T-116 (Fase UI-01): sidebar admin dibangun dari sini, bukan
            // hardcoded di React — lihat NavigationService.
            'navigation' => fn () => $user ? app(NavigationService::class)->forUser($user, $request->session()->get('masquerade_role')) : [],
            // REVISI-R1-v2.md §1.5 — label "Outlet: {nama}" statis di
            // footer sidebar (switcher UI sengaja DITUNDA sampai outlet
            // kedua benar-benar ada). Owner belum tentu punya outlet
            // primary (bypass semua outlet) — tampilkan null, layout
            // menyembunyikan label bila null.
            'activeOutlet' => fn () => $user ? $user->primaryOutlet()?->only(['id', 'name']) : null,
            // T-094 (Fase 15): badge count bel notifikasi di header —
            // dihitung ringan (COUNT saja), isi lengkap di-fetch lazy
            // oleh dropdown lewat NotificationController::index().
            'unreadNotificationsCount' => fn () => $user ? $user->unreadNotifications()->count() : 0,
            'ziggy' => fn () => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'appName' => config('app.name'),
            // Owner Switch Role — masquerade session state
            'masquerade' => fn () => [
                'active' => (bool) $request->session()->get('masquerade_role'),
                'role'   => $request->session()->get('masquerade_role'),
                'label'  => $request->session()->get('masquerade_label'),
            ],
            // Owner Wali Preview flag
            'ownerWaliPreview' => fn () => (bool) $request->session()->get('owner_wali_preview'),
            // Visibilitas Top-Up Wali Santri dari settings
            'allowWaliTopup' => function () {
                try {
                    $row = \Illuminate\Support\Facades\DB::table('settings')->where('group', 'pos')->where('key', 'allow_wali_topup')->first();
                    if ($row !== null) return filter_var($row->value, FILTER_VALIDATE_BOOLEAN);
                } catch (\Throwable) {}
                return true;
            },
        ];
    }
}
