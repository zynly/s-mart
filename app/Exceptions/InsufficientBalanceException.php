<?php

namespace App\Exceptions;

use Exception;

class InsufficientBalanceException extends Exception
{
    public static function make(int $balance, int $requested): self
    {
        return new self("Saldo tidak cukup: tersedia Rp {$balance}, dibutuhkan Rp {$requested}.");
    }
}
