<?php

namespace App\Exceptions;

use Exception;

class DebtOverpaymentException extends Exception
{
    public static function make(int $remaining, int $attempted): self
    {
        return new self("Pembayaran Rp {$attempted} melebihi sisa hutang Rp {$remaining}.");
    }
}
