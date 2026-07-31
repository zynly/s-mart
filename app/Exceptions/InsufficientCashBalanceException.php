<?php

namespace App\Exceptions;

use Exception;

class InsufficientCashBalanceException extends Exception
{
    public static function make(int $balance, int $requested): self
    {
        return new self("Saldo kas tidak cukup: tersedia Rp {$balance}, dibutuhkan Rp {$requested}.");
    }
}
