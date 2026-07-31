<?php

namespace App\Exceptions;

use Exception;

class MaxHoldExceededException extends Exception
{
    public static function make(int $max): self
    {
        return new self("Batas maksimal transaksi ditahan (hold) untuk kasir ini adalah {$max}. Selesaikan atau batalkan hold yang ada dulu.");
    }
}
