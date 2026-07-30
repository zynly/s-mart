<?php

namespace App\Exceptions;

use Exception;

class AuthorizationOverrideException extends Exception
{
    public static function invalidPin(): self
    {
        return new self('PIN tidak cocok dengan pengguna manapun yang memiliki izin ini.');
    }

    public static function permissionNotFound(string $permission): self
    {
        return new self("Izin \"{$permission}\" tidak ditemukan.");
    }

    public static function lockedOut(int $secondsRemaining): self
    {
        $minutes = (int) ceil($secondsRemaining / 60);

        return new self("Terlalu banyak percobaan gagal. Coba lagi dalam {$minutes} menit.");
    }
}
