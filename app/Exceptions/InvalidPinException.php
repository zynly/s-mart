<?php

namespace App\Exceptions;

use Exception;

class InvalidPinException extends Exception
{
    public static function make(): self
    {
        return new self('PIN salah.');
    }
}
