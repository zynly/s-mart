<?php

namespace App\Services;

use App\Exceptions\AuthorizationOverrideException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Spatie\Permission\Models\Permission;

class AuthorizationService
{
    private const MAX_ATTEMPTS = 3;

    private const LOCKOUT_MINUTES = 15;

    public function requestOverride(string $permission, string $pin): User
    {
        $this->ensurePermissionExists($permission);

        $key = $this->throttleKey($permission);

        if (RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS)) {
            throw AuthorizationOverrideException::lockedOut(RateLimiter::availableIn($key));
        }

        $approver = $this->findMatchingUser($permission, $pin);

        if ($approver === null) {
            RateLimiter::hit($key, self::LOCKOUT_MINUTES * 60);
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
        return "authorization-override:{$permission}";
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
