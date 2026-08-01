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
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
            ],
            'status' => fn () => $request->session()->get('status'),
            // AuthorizationOverrideController men-flash ini via ->with()
            // setelah PIN supervisor tervalidasi — SupervisorPinDialog
            // membacanya dari page.props untuk resolve approver_id.
            'approverId' => fn () => $request->session()->get('approverId'),
            // T-116 (Fase UI-01): sidebar admin dibangun dari sini, bukan
            // hardcoded di React — lihat NavigationService.
            'navigation' => fn () => $user ? app(NavigationService::class)->forUser($user) : [],
            // T-094 (Fase 15): badge count bel notifikasi di header —
            // dihitung ringan (COUNT saja), isi lengkap di-fetch lazy
            // oleh dropdown lewat NotificationController::index().
            'unreadNotificationsCount' => fn () => $user ? $user->unreadNotifications()->count() : 0,
            'ziggy' => fn () => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'appName' => config('app.name'),
        ];
    }
}
