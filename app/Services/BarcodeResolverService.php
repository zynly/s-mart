<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductBarcode;
use App\Models\Unit;
use App\Models\UnitConversion;
use DomainException;

class BarcodeResolverService
{
    /**
     * Cari produk dari barcode fisik — bisa dari product_barcodes (satuan
     * dasar/tambahan) atau unit_conversions (mis. barcode DUS). Barcode
     * DUS mengembalikan qty_multiplier > 1 (mis. 1 DUS = 24 PCS).
     *
     * @return array{product: Product, unit: Unit, qty_multiplier: float}
     */
    public function resolve(string $barcode): array
    {
        $productBarcode = ProductBarcode::with(['product', 'unit'])->where('barcode', $barcode)->first();

        if ($productBarcode !== null) {
            return [
                'product' => $productBarcode->product,
                'unit' => $productBarcode->unit,
                'qty_multiplier' => 1.0,
            ];
        }

        $conversion = UnitConversion::with(['product', 'toUnit'])->where('barcode', $barcode)->first();

        if ($conversion !== null) {
            return [
                'product' => $conversion->product,
                'unit' => $conversion->toUnit,
                'qty_multiplier' => (float) $conversion->factor,
            ];
        }

        throw new DomainException("Barcode \"{$barcode}\" tidak dikenali.");
    }
}
