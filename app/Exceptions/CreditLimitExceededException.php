<?php

namespace App\Exceptions;

use Exception;

class CreditLimitExceededException extends Exception
{
    public static function make(int $limit, int $active, int $requested): self
    {
        return new self(
            "Limit piutang terlampaui: limit Rp {$limit}, piutang aktif Rp {$active}, transaksi Rp {$requested}."
        );
    }
}
