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
     * dasar/tambahan), unit_conversions (mis. barcode DUS), SKU produk, atau
     * fallback nama produk.
     *
     * @return array{product: Product, unit: Unit, qty_multiplier: float}
     */
    public function resolve(string $barcode): array
    {
        $barcode = trim($barcode);

        if ($barcode === '') {
            throw new DomainException('Barcode tidak boleh kosong.');
        }

        // 1. Cari exact match di product_barcodes
        $productBarcode = ProductBarcode::with(['product.baseUnit', 'unit'])
            ->where('barcode', $barcode)
            ->first();

        if ($productBarcode !== null && $productBarcode->product !== null && $productBarcode->product->is_active) {
            return [
                'product' => $productBarcode->product,
                'unit' => $productBarcode->unit ?? $productBarcode->product->baseUnit,
                'qty_multiplier' => 1.0,
            ];
        }

        // 2. Cari di unit_conversions (barcode DUS / PAK)
        $conversion = UnitConversion::with(['product', 'toUnit'])
            ->where('barcode', $barcode)
            ->first();

        if ($conversion !== null && $conversion->product !== null && $conversion->product->is_active) {
            return [
                'product' => $conversion->product,
                'unit' => $conversion->toUnit,
                'qty_multiplier' => (float) $conversion->factor,
            ];
        }

        // 3. Fallback: Cari berdasar SKU produk
        $productBySku = Product::with(['baseUnit'])
            ->where('sku', $barcode)
            ->where('is_active', true)
            ->first();

        if ($productBySku !== null) {
            return [
                'product' => $productBySku,
                'unit' => $productBySku->baseUnit,
                'qty_multiplier' => 1.0,
            ];
        }

        throw new DomainException("Barcode / SKU \"{$barcode}\" tidak ditemukan.");
    }
}
