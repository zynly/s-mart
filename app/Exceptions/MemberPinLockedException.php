<?php

namespace App\Exceptions;

use Carbon\Carbon;
use Exception;

class MemberPinLockedException extends Exception
{
    public static function until(Carbon $lockedUntil): self
    {
        $minutes = max(1, (int) ceil(now()->diffInSeconds($lockedUntil) / 60));

        return new self("PIN terkunci karena 3x salah. Coba lagi dalam {$minutes} menit.");
    }
}
