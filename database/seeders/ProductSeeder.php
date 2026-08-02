<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\ProductBarcode;
use App\Models\ProductPrice;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * 30 produk contoh lintas 7 kategori, masing-masing dengan barcode
     * utama & harga awal di outlet utama (PROMPT-POS-SKILLAGE-MART.md
     * § Fase 2 bagian 4).
     */
    private const PRODUCTS = [
        ['Makanan Ringan', 'Chiki Balls 60g', 5000],
        ['Makanan Ringan', 'Chitato 68g', 11000],
        ['Makanan Ringan', 'Taro Net 65g', 8000],
        ['Makanan Ringan', 'Oreo Original 137g', 9500],
        ['Makanan Ringan', 'Roma Kelapa 300g', 10500],
        ['Minuman', 'Air Mineral 600ml', 3000],
        ['Minuman', 'Teh Pucuk Harum 350ml', 4000],
        ['Minuman', 'Pocari Sweat 350ml', 6500],
        ['Minuman', 'Susu UHT Coklat 250ml', 5500],
        ['Minuman', 'Kopi Kapal Api Sachet', 1500],
        ['Sembako', 'Beras Premium 5kg', 65000],
        ['Sembako', 'Minyak Goreng 1L', 18000],
        ['Sembako', 'Gula Pasir 1kg', 16000],
        ['Sembako', 'Telur Ayam 1kg', 28000],
        ['Sembako', 'Mie Instan Goreng', 3200],
        ['Alat Tulis', 'Buku Tulis 38 Lembar', 3500],
        ['Alat Tulis', 'Pulpen Standard AE7', 2500],
        ['Alat Tulis', 'Pensil 2B Faber-Castell', 3000],
        ['Alat Tulis', 'Penghapus Karet', 1500],
        ['Alat Tulis', 'Penggaris 30cm', 3000],
        ['Perlengkapan Mandi', 'Sabun Mandi Batang', 3500],
        ['Perlengkapan Mandi', 'Sikat Gigi', 5000],
        ['Perlengkapan Mandi', 'Pasta Gigi 75g', 8500],
        ['Perlengkapan Mandi', 'Sampo Sachet', 1000],
        ['Perlengkapan Mandi', 'Handuk Kecil', 15000],
        ['Obat-obatan', 'Paracetamol Tablet', 5000],
        ['Obat-obatan', 'Tolak Angin Sachet', 3500],
        ['Obat-obatan', 'Betadine 15ml', 12000],
        ['Obat-obatan', 'Plester Luka', 4000],
        ['Lain-lain', 'Masker Medis 1pcs', 1000],
    ];

    public function run(): void
    {
        $outlet = Outlet::where('is_main', true)->firstOrFail();
        $pcs = Unit::where('code', 'PCS')->firstOrFail();
        $admin = User::where('username', 'admin')->first() ?? User::where('username', 'owner')->firstOrFail();

        foreach (self::PRODUCTS as $index => [$categoryName, $name, $price]) {
            $category = Category::where('name', $categoryName)->first();
            $sku = 'SKU-'.str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT);

            $product = Product::firstOrCreate(
                ['sku' => $sku],
                [
                    'name' => $name,
                    'category_id' => $category?->id,
                    'base_unit_id' => $pcs->id,
                    'is_expirable' => in_array($categoryName, ['Makanan Ringan', 'Minuman', 'Sembako', 'Obat-obatan'], true),
                    'min_stock' => 10,
                    'is_active' => true,
                    'is_visible_public' => true,
                    // T-111 (Fase 19): beberapa produk ditandai favorit
                    // supaya section "Produk Pilihan" storefront publik
                    // tidak kosong di DB baru — bukan aturan bisnis,
                    // murni data demo/onboarding.
                    'is_favorite' => $index % 7 === 0,
                ],
            );

            ProductBarcode::firstOrCreate(
                ['product_id' => $product->id, 'unit_id' => $pcs->id],
                ['barcode' => '899'.str_pad((string) (1000 + $index), 10, '0', STR_PAD_LEFT), 'is_primary' => true],
            );

            if (! ProductPrice::where('product_id', $product->id)->where('outlet_id', $outlet->id)->exists()) {
                ProductPrice::create([
                    'product_id' => $product->id,
                    'outlet_id' => $outlet->id,
                    'unit_id' => $pcs->id,
                    'price' => $price,
                    'effective_from' => now()->toDateString(),
                    'created_by' => $admin->id,
                ]);
            }
        }
    }
}
