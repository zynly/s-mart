<?php

namespace App\Exceptions;

use Exception;

class SessionAlreadyOpenException extends Exception
{
    public static function make(): self
    {
        return new self('Anda masih punya sesi kasir yang terbuka. Tutup sesi itu dulu sebelum membuka sesi baru.');
    }
}
