<?php

namespace App\Services;

use App\Exceptions\MemberPinLockedException;
use App\Exceptions\WeakPinException;
use App\Models\Member;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class MemberPinService
{
    public const DEFAULT_PIN = '123456';

    private const WEAK_PINS = [
        '1234', '0000', '1111', '2222', '3333', '4444',
        '5555', '6666', '7777', '8888', '9999', '4321',
    ];

    public function set(Member $member, string $pin): void
    {
        if ($pin !== self::DEFAULT_PIN) {
            $this->ensureNotWeak($member, $pin);
        }

        $member->update([
            'pin' => $pin,
            'pin_attempts' => 0,
            'pin_locked_until' => null,
        ]);
    }

    public function verify(Member $member, string $pin): bool
    {
        // Audit Fase 7 (Temuan Rendah): sebelumnya baca pin_attempts/
        // pin_locked_until lalu tulis TANPA lock — dua percobaan PIN
        // konkuren pada anggota yang sama bisa membaca counter yang sama
        // sebelum salah satu commit, memperlebar jendela percobaan
        // sebelum lockout benar-benar aktif dibanding niat desainnya.
        return DB::transaction(function () use ($member, $pin) {
            $locked = Member::lockForUpdate()->findOrFail($member->id);

            if ($locked->pin_locked_until !== null && $locked->pin_locked_until->isFuture()) {
                throw MemberPinLockedException::until($locked->pin_locked_until);
            }

            if ($locked->pin === null || ! Hash::check($pin, $locked->pin)) {
                $attempts = $locked->pin_attempts + 1;
                // Temuan audit keamanan (code-quality #1/#8): sebelumnya
                // hardcode 3/15, mengabaikan config('pos.pin_max_attempts')/
                // ('pos.pin_lockout_minutes') yang sudah dipajang & bisa
                // diubah owner lewat halaman Pengaturan (T-103) — owner ubah
                // nilainya, toast sukses, tapi tidak berpengaruh sama sekali.
                $isLocked = $attempts >= (int) config('pos.pin_max_attempts', 3);

                $locked->update([
                    'pin_attempts' => $isLocked ? 0 : $attempts,
                    'pin_locked_until' => $isLocked ? now()->addMinutes((int) config('pos.pin_lockout_minutes', 15)) : null,
                ]);

                return false;
            }

            $locked->update(['pin_attempts' => 0]);

            return true;
        });
    }

    public function reset(Member $member): void
    {
        $member->update([
            'pin' => null,
            'pin_attempts' => 0,
            'pin_locked_until' => null,
        ]);
    }

    public function resetToDefault(Member $member): void
    {
        $member->update([
            'pin' => self::DEFAULT_PIN,
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
