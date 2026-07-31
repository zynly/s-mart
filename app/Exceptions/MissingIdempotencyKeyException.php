<?php

namespace App\Exceptions;

use Exception;

class MissingIdempotencyKeyException extends Exception
{
    public static function make(): self
    {
        return new self('idempotency_key wajib diisi untuk semua mutasi saldo deposit.');
    }
}
