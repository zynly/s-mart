<?php

namespace App\Exceptions;

use Exception;

class MissingExpiryDateException extends Exception
{
    public static function make(string $productName): self
    {
        return new self("Produk \"{$productName}\" wajib diisi tanggal kadaluwarsa saat penerimaan barang.");
    }
}
