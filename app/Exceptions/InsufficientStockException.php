<?php

namespace App\Exceptions;

use Exception;

class InsufficientStockException extends Exception
{
    public static function make(string $productName, float $available, float $requested): self
    {
        return new self("Stok \"{$productName}\" tidak cukup: tersedia {$available}, dibutuhkan {$requested}.");
    }
}
