<?php

namespace App\Exceptions;

use Exception;

class MemberPinNotSetException extends Exception
{
    public static function make(): self
    {
        return new self('Anggota belum membuat PIN — buat PIN dahulu sebelum bayar pakai saldo.');
    }
}
