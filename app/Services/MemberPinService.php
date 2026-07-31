<?php

namespace App\Services;

use App\Exceptions\MemberPinLockedException;
use App\Exceptions\WeakPinException;
use App\Models\Member;
use Illuminate\Support\Facades\Hash;

class MemberPinService
{
    private const MAX_ATTEMPTS = 3;

    private const LOCKOUT_MINUTES = 15;

    private const WEAK_PINS = [
        '1234', '0000', '1111', '2222', '3333', '4444',
        '5555', '6666', '7777', '8888', '9999', '4321',
    ];

    public function set(Member $member, string $pin): void
    {
        $this->ensureNotWeak($member, $pin);

        $member->update([
            'pin' => $pin,
            'pin_attempts' => 0,
            'pin_locked_until' => null,
        ]);
    }

    public function verify(Member $member, string $pin): bool
    {
        if ($member->pin_locked_until !== null && $member->pin_locked_until->isFuture()) {
            throw MemberPinLockedException::until($member->pin_locked_until);
        }

        if ($member->pin === null || ! Hash::check($pin, $member->pin)) {
            $attempts = $member->pin_attempts + 1;
            $locked = $attempts >= self::MAX_ATTEMPTS;

            $member->update([
                'pin_attempts' => $locked ? 0 : $attempts,
                'pin_locked_until' => $locked ? now()->addMinutes(self::LOCKOUT_MINUTES) : null,
            ]);

            return false;
        }

        $member->update(['pin_attempts' => 0]);

        return true;
    }

    public function reset(Member $member): void
    {
        $member->update([
            'pin' => null,
            'pin_attempts' => 0,
            'pin_locked_until' => null,
        ]);
    }

    private function ensureNotWeak(Member $member, string $pin): void
    {
        if (in_array($pin, self::WEAK_PINS, true)) {
            throw WeakPinException::make();
        }

        if (preg_match('/^(\d)\1{3}$/', $pin) === 1) {
            throw WeakPinException::make();
        }

        if ($member->birth_date !== null) {
            $variants = [
                $member->birth_date->format('dm'),
                $member->birth_date->format('md'),
                $member->birth_date->format('Y'),
            ];

            if (in_array($pin, $variants, true)) {
                throw WeakPinException::make();
            }
        }
    }
}
