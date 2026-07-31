<?php

namespace App\Services;

use App\Models\Outlet;
use App\Models\Product;
use App\Models\ProductBarcode;
use App\Models\Unit;
use Illuminate\Support\Facades\DB;

class ProductService
{
    public function __construct(private readonly PriceService $priceService) {}

    /**
     * @param  array<string, mixed>  $data  Kolom products.*
     * @param  array<int, array{barcode: string, unit_id: int, is_primary?: bool}>  $barcodes
     * @param  array{outlet_id: int, unit_id: int, price: int, member_price?: int|null}|null  $initialPrice
     */
    public function create(array $data, array $barcodes = [], ?array $initialPrice = null): Product
    {
        return DB::transaction(function () use ($data, $barcodes, $initialPrice) {
            $product = Product::create($data);

            $this->syncBarcodes($product, $barcodes);

            if ($initialPrice !== null) {
                $this->priceService->changePrice(
                    $product,
                    Outlet::findOrFail($initialPrice['outlet_id']),
                    Unit::findOrFail($initialPrice['unit_id']),
                    $initialPrice['price'],
                    now()->toDateString(),
                    $initialPrice['member_price'] ?? null,
                );
            }

            return $product->fresh(['barcodes', 'prices']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, array{barcode: string, unit_id: int, is_primary?: bool}>  $barcodes
     */
    public function update(Product $product, array $data, array $barcodes = []): Product
    {
        return DB::transaction(function () use ($product, $data, $barcodes) {
            $product->update($data);
            $this->syncBarcodes($product, $barcodes);

            return $product->fresh(['barcodes']);
        });
    }

    /**
     * @param  array<int, array{barcode: string, unit_id: int, is_primary?: bool}>  $barcodes
     */
    private function syncBarcodes(Product $product, array $barcodes): void
    {
        if ($barcodes === []) {
            return;
        }

        $product->barcodes()->delete();

        foreach ($barcodes as $barcode) {
            ProductBarcode::create([
                'product_id' => $product->id,
                'barcode' => $barcode['barcode'],
                'unit_id' => $barcode['unit_id'],
                'is_primary' => $barcode['is_primary'] ?? false,
            ]);
        }
    }
}
