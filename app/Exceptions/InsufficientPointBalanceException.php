<?php

namespace App\Exceptions;

use Exception;

class InsufficientPointBalanceException extends Exception
{
    public static function make(int $balance, int $requested): self
    {
        return new self("Poin tidak cukup: tersedia {$balance}, dibutuhkan {$requested}.");
    }
}
