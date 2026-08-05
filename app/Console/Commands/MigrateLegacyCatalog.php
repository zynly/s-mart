<?php

namespace App\Console\Commands;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\ProductBarcode;
use App\Models\ProductImage;
use App\Models\ProductPrice;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migrasi satu-kali data produk, kategori produk, dan satuan dari
 * POS lama (POS-OLD.sql, diimpor ke DB `pos_old_analysis`) ke skema
 * baru. Aturan pembersihan (gabung satuan duplikat ejaan, resolusi
 * produk kembar per-kasus, dsb) berasal dari analisis manual —
 * lihat plan sesi migrasi. TIDAK menyalin file gambar: file lama
 * sudah ada persis di storage/app/public/products/ (diverifikasi
 * 553/553 cocok), command ini hanya membuat baris `product_images`
 * yang menunjuk ke path tsb.
 */
class MigrateLegacyCatalog extends Command
{
    protected $signature = 'legacy:migrate-catalog
        {--dry-run : Hitung & tampilkan ringkasan tanpa menulis apapun ke database}
        {--legacy-host=127.0.0.1}
        {--legacy-database=pos_old_analysis}
        {--legacy-user=root}
        {--legacy-password=}';

    protected $description = 'Migrasi produk, kategori, satuan (+harga awal & gambar) dari POS lama ke skema baru';

    /** old_id yang DIGUGURKAN karena duplikat produk yang sama (di-merge ke id survivor). */
    private const MERGE_DROP = [770, 320, 406, 771];

    /** old_id survivor => override field yang diambil dari pasangannya yang digugurkan. */
    private const SURVIVOR_OVERRIDES = [
        // Nipis Madu: #766 (barcode) selamat tapi tanpa gambar, #771 (digugurkan) punya gambar.
        766 => ['image' => 'products/01KR8D1EG14VMVF1G47Y938XQ1.jpg'],
    ];

    /**
     * old_id produk yang TETAP dimigrasikan terpisah (bukan produk
     * yang sama dgn pasangannya / status ambigu tanpa verifikasi
     * fisik) tapi barcode-nya TIDAK ikut dibawa karena sudah dipakai
     * baris pasangannya (unique constraint). Perlu verifikasi manual
     * barcode fisik pasca-migrasi.
     */
    private const BARCODE_NULLED = [595, 884, 905, 562, 909];

    /** old_category_id => nama bersih (kapitalisasi/spasi diperbaiki manual, 3 kasus). */
    private const CATEGORY_NAME_OVERRIDES = [
        46 => 'Perlengkapan Makan',
        43 => 'Permen',
        40 => 'Pewangi Ruangan',
    ];

    /**
     * Rencana satuan master: key group => [name, code, old_unit_id[]].
     * `Botol`/`Btl` dan `box`/`Kotak` SENGAJA dibiarkan terpisah
     * (bukan disatukan) — potensi beda ukuran kemasan, tidak bisa
     * dipastikan tanpa verifikasi fisik. `Dus`/`Renceng` (unit_id
     * 6, 9) SENGAJA tidak dimigrasikan — 0 produk memakainya.
     */
    private const UNIT_PLAN = [
        'PCS' => ['name' => 'Pcs', 'old_ids' => [1, 10]],
        'PACK' => ['name' => 'Pack', 'old_ids' => [3, 7]],
        'KG' => ['name' => 'Kg', 'old_ids' => [4, 19]],
        'GRAM' => ['name' => 'Gram', 'old_ids' => [16, 17]],
        'BOTOL' => ['name' => 'Botol', 'old_ids' => [11]],
        'BTL' => ['name' => 'Btl', 'old_ids' => [13]],
        'BOX' => ['name' => 'Box', 'old_ids' => [2]],
        'KOTAK' => ['name' => 'Kotak', 'old_ids' => [8]],
        'BKS' => ['name' => 'Bks', 'old_ids' => [12]],
        'KALENG' => ['name' => 'Kaleng', 'old_ids' => [18]],
        'BH' => ['name' => 'Bh', 'old_ids' => [14]],
        'UNIT' => ['name' => 'Unit', 'old_ids' => [15]],
        'LITER' => ['name' => 'Liter', 'old_ids' => [5]],
    ];

    private const WIPE_TABLES = [
        'sale_items', 'sale_payments', 'point_transactions', 'receivables', 'debts',
        'sales',
        'promo_products', 'promos',
        'stock_movements', 'stock_layer_consumptions', 'stock_layers', 'stocks',
        'purchase_items', 'purchases',
        'cashier_sessions',
        'product_prices', 'product_barcodes', 'product_images', 'unit_conversions',
        'products', 'categories', 'units', 'brands',
    ];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $this->configureLegacyConnection();

        if (! $dryRun && Product::count() > 0) {
            $confirmed = $this->confirm(
                'Tabel products TIDAK kosong. Melanjutkan akan MENGHAPUS seluruh produk/kategori/satuan/brand beserta data transaksi (sales, stok, purchase, dll) yang bergantung padanya. Lanjutkan?',
                false,
            );

            if (! $confirmed) {
                $this->warn('Dibatalkan.');

                return self::FAILURE;
            }
        }

        $legacyCategories = DB::connection('legacy_import')->table('product_categories')->orderBy('product_category_id')->get();
        $legacyProducts = DB::connection('legacy_import')->table('products')->orderBy('id')->get();
        $productsToMigrate = $legacyProducts->reject(fn ($p) => in_array($p->id, self::MERGE_DROP, true));

        $this->info('Ringkasan proyeksi:');
        $this->line('  Satuan master  : '.count(self::UNIT_PLAN));
        $this->line('  Kategori       : '.$legacyCategories->count());
        $this->line('  Produk         : '.$productsToMigrate->count().' (dari '.$legacyProducts->count().' baris lama, '.count(self::MERGE_DROP).' digabung)');
        $this->line('  Barcode kosong (perlu verifikasi manual) : '.count(self::BARCODE_NULLED));

        if ($dryRun) {
            $this->warn('--dry-run aktif — tidak ada perubahan ditulis ke database.');

            return self::SUCCESS;
        }

        $outlet = Outlet::where('is_main', true)->firstOrFail();
        $admin = User::where('username', 'admin')->first() ?? User::where('username', 'owner')->firstOrFail();

        Schema::disableForeignKeyConstraints();
        foreach (self::WIPE_TABLES as $table) {
            DB::table($table)->truncate();
        }
        Schema::enableForeignKeyConstraints();
        $this->info('Data lama (demo + turunannya) sudah dikosongkan.');

        activity()->disableLogging();

        $flaggedSkus = [];

        DB::transaction(function () use ($legacyCategories, $productsToMigrate, $outlet, $admin, &$flaggedSkus): void {
            $unitMap = $this->importUnits();
            $categoryMap = $this->importCategories($legacyCategories);
            $flaggedSkus = $this->importProducts($productsToMigrate, $unitMap, $categoryMap, $outlet, $admin);
        });

        activity()->enableLogging();

        $this->info('Migrasi selesai: '.count(self::UNIT_PLAN).' satuan, '.$legacyCategories->count().' kategori, '.$productsToMigrate->count().' produk.');

        if ($flaggedSkus !== []) {
            $this->warn('Produk berikut perlu verifikasi barcode fisik manual (barcode lama dikosongkan karena bentrok dgn produk lain):');
            $this->table(['SKU', 'Nama'], $flaggedSkus);
        }

        $this->warn('Satuan "Botol"/"Btl" dan "box"/"Kotak" sengaja dibiarkan terpisah — tinjau manual apakah perlu digabung via panel admin.');

        return self::SUCCESS;
    }

    private function configureLegacyConnection(): void
    {
        config(['database.connections.legacy_import' => [
            'driver' => 'mysql',
            'host' => $this->option('legacy-host'),
            'port' => '3306',
            'database' => $this->option('legacy-database'),
            'username' => $this->option('legacy-user'),
            'password' => $this->option('legacy-password'),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
        ]]);

        DB::purge('legacy_import');
    }

    /** @return array<int,int> old_unit_id => new Unit id */
    private function importUnits(): array
    {
        $map = [];

        foreach (self::UNIT_PLAN as $code => $def) {
            $unit = Unit::create(['code' => $code, 'name' => $def['name']]);

            foreach ($def['old_ids'] as $oldId) {
                $map[$oldId] = $unit->id;
            }
        }

        return $map;
    }

    /** @return array<int,int> old_product_category_id => new Category id */
    private function importCategories($legacyCategories): array
    {
        $map = [];
        $seq = 0;

        foreach ($legacyCategories as $row) {
            $seq++;
            $name = self::CATEGORY_NAME_OVERRIDES[$row->product_category_id] ?? trim($row->name_category);

            $category = Category::create([
                'code' => 'CAT-'.str_pad((string) $seq, 2, '0', STR_PAD_LEFT),
                'name' => $name,
            ]);

            $map[$row->product_category_id] = $category->id;
        }

        return $map;
    }

    /**
     * @return array<int,array{0:string,1:string}> daftar [sku, nama] produk yang barcode-nya dikosongkan
     */
    private function importProducts($legacyProducts, array $unitMap, array $categoryMap, Outlet $outlet, User $admin): array
    {
        $brandCache = [];
        $flagged = [];
        $today = now()->toDateString();

        foreach ($legacyProducts as $old) {
            $overrides = self::SURVIVOR_OVERRIDES[$old->id] ?? [];
            $image = $overrides['image'] ?? $old->image;

            $brandId = null;

            if (filled($old->brand)) {
                $brandName = trim($old->brand);
                $brandId = $brandCache[$brandName] ??= Brand::firstOrCreate(['name' => $brandName])->id;
            }

            $product = Product::create([
                'sku' => 'LEG-'.str_pad((string) $old->id, 4, '0', STR_PAD_LEFT),
                'name' => $old->name,
                'category_id' => $categoryMap[$old->product_category_id] ?? null,
                'brand_id' => $brandId,
                'base_unit_id' => $unitMap[$old->unit_id] ?? null,
                'description' => $old->description,
                'is_expirable' => (bool) $old->has_expiry,
                'min_stock' => $old->min_stock ?? 0,
                'is_active' => true,
            ]);

            if (filled($old->barcode) && ! in_array($old->id, self::BARCODE_NULLED, true)) {
                ProductBarcode::create([
                    'product_id' => $product->id,
                    'barcode' => $old->barcode,
                    'unit_id' => $unitMap[$old->unit_id] ?? null,
                    'is_primary' => true,
                ]);
            } elseif (in_array($old->id, self::BARCODE_NULLED, true)) {
                $flagged[] = [$product->sku, $product->name];
            }

            if (filled($image)) {
                ProductImage::create([
                    'product_id' => $product->id,
                    'path' => $image,
                    'sort_order' => 0,
                    'is_primary' => true,
                ]);
            }

            ProductPrice::create([
                'product_id' => $product->id,
                'outlet_id' => $outlet->id,
                'unit_id' => $unitMap[$old->unit_id] ?? null,
                'price' => (int) round((float) $old->selling_price),
                'effective_from' => $today,
                'created_by' => $admin->id,
            ]);
        }

        return $flagged;
    }
}
