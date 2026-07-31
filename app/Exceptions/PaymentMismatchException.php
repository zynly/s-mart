<?php

namespace App\Exceptions;

use Exception;

class PaymentMismatchException extends Exception
{
    public static function make(int $grandTotal, int $totalPaid): self
    {
        return new self("Total pembayaran (Rp {$totalPaid}) tidak sama dengan total tagihan (Rp {$grandTotal}).");
    }
}
