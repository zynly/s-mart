<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\ProductBarcode;
use App\Models\ProductImage;
use App\Models\ProductPrice;
use App\Models\StockLayer;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RestoreOriginalProductsSeeder extends Seeder
{
    public function run(): void
    {
        $posOldFile = 'C:/Pak-Hakim/Worker/Dokumen Arsip/Skill Village/POS-OLD.sql';
        if (! file_exists($posOldFile)) {
            $this->command?->error("File POS-OLD.sql tidak ditemukan di: {$posOldFile}");
            return;
        }

        $outlet = Outlet::where('is_main', true)->first() ?? Outlet::first();
        $admin = User::where('username', 'admin')->first() ?? User::where('username', 'owner')->first();
        $pcs = Unit::where('code', 'PCS')->first() ?? Unit::firstOrCreate(['name' => 'Pcs'], ['code' => 'PCS']);

        if (! $outlet || ! $admin) {
            $this->command?->error("Outlet atau Admin user belum ada.");
            return;
        }

        $content = file_get_contents($posOldFile);

        // ───────────────────────────────────────────────
        // 1. Kategori
        // ───────────────────────────────────────────────
        preg_match('/INSERT INTO `product_categories` \((.*?)\) VALUES\s*(.*?);/s', $content, $catMatch);
        $catMap = []; // old_id => new_id
        if ($catMatch) {
            preg_match_all('/\(([0-9]+),\s*\'(.*?)\'/', $catMatch[2], $rows, PREG_SET_ORDER);
            foreach ($rows as $r) {
                $oldId = (int) $r[1];
                $name = stripslashes(trim($r[2]));
                $slugCode = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '_', $name));
                $code = !empty($slugCode) ? substr($slugCode, 0, 30) : 'CAT_'.$oldId;
                $cat = Category::firstOrCreate(['name' => $name], ['code' => $code]);
                $catMap[$oldId] = $cat->id;
            }
        }

        // ───────────────────────────────────────────────
        // 2. Satuan Unit
        // ───────────────────────────────────────────────
        preg_match('/INSERT INTO `units` \((.*?)\) VALUES\s*(.*?);/s', $content, $unitMatch);
        $unitMap = []; // old_id => new_id
        if ($unitMatch) {
            preg_match_all('/\(([0-9]+),\s*\'(.*?)\',\s*\'(.*?)\'/', $unitMatch[2], $rows, PREG_SET_ORDER);
            foreach ($rows as $r) {
                $oldId = (int) $r[1];
                $name = stripslashes(trim($r[2]));
                $code = strtoupper(stripslashes(trim($r[3])));
                $u = Unit::firstOrCreate(['code' => $code], ['name' => $name]);
                $unitMap[$oldId] = $u->id;
            }
        }

        // ───────────────────────────────────────────────
        // 3. Produk & Gambar RustFS
        // ───────────────────────────────────────────────
        preg_match_all('/INSERT INTO `products` \((.*?)\) VALUES\s*(.*?);/s', $content, $prodMatches, PREG_SET_ORDER);
        
        $insertedCount = 0;
        $imageCount = 0;

        foreach ($prodMatches as $pm) {
            preg_match_all('/\(([0-9]+),\s*\'(.*?)\',\s*(\'.*?\'|NULL),\s*(\'.*?\'|NULL),\s*([0-9]+),\s*([0-9\.]+),\s*([0-9]+),\s*([0-9]+),\s*(\'.*?\'|NULL),\s*(\'.*?\'|NULL),\s*(\'.*?\'|NULL),\s*([0-9]+|NULL),\s*([0-9]+)/', $pm[2], $rows, PREG_SET_ORDER);
            foreach ($rows as $r) {
                $oldId = (int) $r[1];
                $name = stripslashes(trim($r[2]));
                $barcode = $r[3] !== 'NULL' ? trim($r[3], "'") : null;
                $sku = $r[4] !== 'NULL' ? trim($r[4], "'") : 'SKU-'.str_pad((string) $oldId, 4, '0', STR_PAD_LEFT);
                $hasExpiry = (bool) $r[5];
                $sellingPrice = (float) $r[6];
                $catId = $catMap[(int) $r[7]] ?? Category::first()?->id;
                $unitId = $unitMap[(int) $r[8]] ?? $pcs->id;
                $imagePath = $r[11] !== 'NULL' ? trim($r[11], "'") : null;
                $minStock = $r[12] !== 'NULL' ? (int) $r[12] : 10;

                // Create or find product safely (append only)
                $product = Product::firstOrCreate(
                    ['name' => $name],
                    [
                        'sku' => $sku,
                        'category_id' => $catId,
                        'base_unit_id' => $unitId,
                        'is_expirable' => $hasExpiry,
                        'min_stock' => $minStock,
                        'is_active' => true,
                        'is_visible_public' => true,
                        'is_favorite' => false,
                    ]
                );

                // Barcode
                if ($barcode && ! ProductBarcode::where('barcode', $barcode)->exists()) {
                    ProductBarcode::firstOrCreate(
                        ['product_id' => $product->id, 'barcode' => $barcode],
                        ['unit_id' => $unitId, 'is_primary' => true]
                    );
                }

                // Price
                if (! ProductPrice::where('product_id', $product->id)->where('outlet_id', $outlet->id)->exists()) {
                    ProductPrice::create([
                        'product_id' => $product->id,
                        'outlet_id' => $outlet->id,
                        'unit_id' => $unitId,
                        'price' => $sellingPrice > 0 ? $sellingPrice : 5000,
                        'effective_from' => now()->toDateString(),
                        'created_by' => $admin->id,
                    ]);
                }

                // RustFS Image
                if ($imagePath && ! ProductImage::where('product_id', $product->id)->exists()) {
                    ProductImage::create([
                        'product_id' => $product->id,
                        'path' => $imagePath,
                        'alt' => $product->name,
                        'sort_order' => 0,
                        'is_primary' => true,
                    ]);
                    $imageCount++;
                }

                // Initial Stock Layer
                if (! StockLayer::where('product_id', $product->id)->where('outlet_id', $outlet->id)->exists()) {
                    StockLayer::create([
                        'product_id' => $product->id,
                        'outlet_id' => $outlet->id,
                        'qty_in' => 50,
                        'qty_remaining' => 50,
                        'unit_cost' => (int) round($sellingPrice * 0.8),
                        'received_at' => now(),
                    ]);
                }

                $insertedCount++;
            }
        }

        $this->command?->info("RestoreOriginalProductsSeeder Berhasil: {$insertedCount} Produk & {$imageCount} Foto RustFS terhubung.");
    }
}
