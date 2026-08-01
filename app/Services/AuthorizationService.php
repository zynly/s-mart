<?php

namespace App\Services;

use App\Exceptions\AuthorizationOverrideException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Spatie\Permission\Models\Permission;

class AuthorizationService
{
    public function requestOverride(string $permission, string $pin): User
    {
        $this->ensurePermissionExists($permission);

        $key = $this->throttleKey($permission);
        // Temuan audit keamanan (code-quality #1/#8): sebelumnya hardcode
        // 3/15, mengabaikan config('pos.pin_max_attempts')/
        // ('pos.pin_lockout_minutes') yang bisa diubah owner lewat
        // Pengaturan (T-103).
        $maxAttempts = (int) config('pos.pin_max_attempts', 3);
        $lockoutMinutes = (int) config('pos.pin_lockout_minutes', 15);

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            throw AuthorizationOverrideException::lockedOut(RateLimiter::availableIn($key));
        }

        $approver = $this->findMatchingUser($permission, $pin);

        if ($approver === null) {
            RateLimiter::hit($key, $lockoutMinutes * 60);
            $this->logAttempt($permission, null, success: false);

            throw AuthorizationOverrideException::invalidPin();
        }

        RateLimiter::clear($key);
        $this->logAttempt($permission, $approver, success: true);

        return $approver;
    }

    private function ensurePermissionExists(string $permission): void
    {
        if (! Permission::where('name', $permission)->exists()) {
            throw AuthorizationOverrideException::permissionNotFound($permission);
        }
    }

    private function findMatchingUser(string $permission, string $pin): ?User
    {
        return User::query()
            ->whereNotNull('pin')
            ->where('is_active', true)
            ->permission($permission)
            ->get()
            ->first(fn (User $user) => Hash::check($pin, $user->pin));
    }

    private function throttleKey(string $permission): string
    {
        // Temuan audit keamanan (Phase B): sebelumnya key GLOBAL per
        // permission — 3 PIN salah dari SATU terminal mengunci override
        // permission itu untuk SEMUA orang di SEMUA terminal selama masa
        // lockout (kasir bisa memicu ini sengaja untuk memblokir void/
        // approve selisih kas/dll di seluruh toko). Di-key per (permission,
        // aktor yang meminta override) supaya satu kasir tidak bisa
        // mengunci toko — kasir lain tetap bisa minta override normal.
        return "authorization-override:{$permission}:".(auth()->id() ?? request()->ip());
    }

    private function logAttempt(string $permission, ?User $approver, bool $success): void
    {
        activity('authorization')
            ->withProperties([
                'permission' => $permission,
                'success' => $success,
                'ip' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ])
            ->causedBy($approver)
            ->log($success ? "Override disetujui untuk {$permission}" : "Override gagal untuk {$permission}");
    }
}
