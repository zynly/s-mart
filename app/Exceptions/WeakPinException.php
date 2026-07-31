<?php

namespace App\Exceptions;

use Exception;

class WeakPinException extends Exception
{
    public static function make(): self
    {
        return new self('PIN terlalu lemah (mis. 1234, 0000, angka berulang, atau tanggal lahir). Gunakan PIN lain.');
    }
}
