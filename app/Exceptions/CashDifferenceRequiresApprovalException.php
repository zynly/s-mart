<?php

namespace App\Exceptions;

use Exception;

class CashDifferenceRequiresApprovalException extends Exception
{
    public static function make(int $difference): self
    {
        return new self("Selisih kas Rp {$difference} melebihi batas toleransi — wajib isi alasan dan persetujuan supervisor.");
    }
}
