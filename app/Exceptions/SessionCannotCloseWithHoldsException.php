<?php

namespace App\Exceptions;

use Exception;

class SessionCannotCloseWithHoldsException extends Exception
{
    public static function make(int $holdCount): self
    {
        return new self("Sesi tidak bisa ditutup: masih ada {$holdCount} transaksi ditahan (hold). Selesaikan atau batalkan dulu.");
    }
}
