<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Coupon;
use App\Models\MemberLevel;
use App\Models\Product;
use App\Models\Promo;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PromoDiskonKuponVoucherSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('username', 'admin')->first()
            ?? User::where('username', 'owner')->first()
            ?? User::first();

        $adminId = $admin?->id ?? 1;
        $now = now();
        $startDate = $now->copy()->subDay()->toDateString();
        $endDate = $now->copy()->addMonths(3)->toDateString();
        $validFrom = $now->copy()->subDay();
        $validUntil = $now->copy()->addMonths(3);

        DB::beginTransaction();

        try {
            // Master references
            $tehPucuk = Product::where('name', 'ilike', '%teh pucuk%')->first() ?? Product::first();
            $chiki = Product::where('name', 'ilike', '%chiki%')->first() ?? Product::find(1);
            $bengBeng = Product::where('name', 'ilike', '%beng beng%')->first() ?? Product::find(31);
            $beras = Product::where('name', 'ilike', '%beras%')->first() ?? Product::find(11);
            $minyak = Product::where('name', 'ilike', '%minyak%')->first() ?? Product::find(12);
            $gula = Product::where('name', 'ilike', '%gula%')->first() ?? Product::find(13);
            $mie = Product::where('name', 'ilike', '%mie%')->orWhere('name', 'ilike', '%sedap%')->orWhere('name', 'ilike', '%indomie%')->first() ?? Product::first();
            $buku = Product::where('name', 'ilike', '%buku%')->first() ?? Product::find(16);

            $catSnack = Category::where('code', 'SNACK')->first() ?? Category::where('id', 1)->first();
            $catMinuman = Category::where('code', 'MINUMAN_DINGIN')->first() ?? Category::where('id', 2)->first();
            $catPerawatan = Category::where('code', 'PERAWATAN_DIRI')->first() ?? Category::where('id', 5)->first();
            $catAtk = Category::where('code', 'ATK___PERLENGKAPAN')->first() ?? Category::where('id', 4)->first();
            $catDapur = Category::where('code', 'PERLENGKAPAN_DAPUR')->first() ?? Category::where('id', 7)->first();
            $catPakaian = Category::where('code', 'PAKAIAN')->first() ?? Category::where('id', 7)->first();

            $lvlFasilitator = MemberLevel::where('code', 'FASILITATOR')->first();
            $lvlStaf = MemberLevel::where('code', 'STAF')->first();
            $lvlPrestasi = MemberLevel::where('code', 'SANTRI_BERPRESTASI')->first();
            $lvlSantri = MemberLevel::where('code', 'SANTRI')->first();

            // ═══════════════════════════════════════════════════════════════
            // 1. TYPE: PRODUCT (Diskon Barang Tertentu - 3 Items)
            // ═══════════════════════════════════════════════════════════════
            $p1 = Promo::firstOrCreate(
                ['code' => 'PROMO-PROD-SEMBAKO10'],
                [
                    'name' => 'Diskon Sembako Hemat 10%',
                    'description' => 'Diskon 10% untuk Beras, Minyak Goreng, dan Gula Pasir pilihan',
                    'type' => 'product',
                    'scope' => 'item',
                    'discount_type' => 'percent',
                    'discount_value' => 10,
                    'max_discount' => 10000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 10,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            $p1Prods = array_filter([$beras?->id, $minyak?->id, $gula?->id]);
            if (!empty($p1Prods)) $p1->products()->syncWithoutDetaching($p1Prods);

            $p2 = Promo::firstOrCreate(
                ['code' => 'PROMO-PROD-TEHPUCUK'],
                [
                    'name' => 'Potongan Rp 1.000 Teh Pucuk',
                    'description' => 'Potongan langsung Rp 1.000 untuk setiap pembelian Teh Pucuk Harum',
                    'type' => 'product',
                    'scope' => 'item',
                    'discount_type' => 'amount',
                    'discount_value' => 1000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 8,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($tehPucuk) $p2->products()->syncWithoutDetaching([$tehPucuk->id]);

            $p3 = Promo::firstOrCreate(
                ['code' => 'PROMO-PROD-BENGBENG'],
                [
                    'name' => 'Spesial Coklat Beng Beng Diskon Rp 500',
                    'description' => 'Potongan Rp 500 untuk snack coklat Beng Beng favorit santri',
                    'type' => 'product',
                    'scope' => 'item',
                    'discount_type' => 'amount',
                    'discount_value' => 500,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 5,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($bengBeng) $p3->products()->syncWithoutDetaching([$bengBeng->id]);

            // ═══════════════════════════════════════════════════════════════
            // 2. TYPE: CATEGORY (Diskon Kategori Barang - 3 Items)
            // ═══════════════════════════════════════════════════════════════
            $c1 = Promo::firstOrCreate(
                ['code' => 'PROMO-CAT-MINUMAN'],
                [
                    'name' => 'Diskon Minuman Dingin Rp 1.000',
                    'description' => 'Diskon Rp 1.000 per botol untuk seluruh kategori minuman',
                    'type' => 'category',
                    'scope' => 'item',
                    'discount_type' => 'amount',
                    'discount_value' => 1000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 7,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($catMinuman) $c1->categories()->syncWithoutDetaching([$catMinuman->id]);

            $c2 = Promo::firstOrCreate(
                ['code' => 'PROMO-CAT-SNACK'],
                [
                    'name' => 'Diskon 5% Semua Makanan Ringan',
                    'description' => 'Diskon 5% untuk semua aneka jajanan dan snack di etalase',
                    'type' => 'category',
                    'scope' => 'item',
                    'discount_type' => 'percent',
                    'discount_value' => 5,
                    'max_discount' => 3000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 6,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($catSnack) $c2->categories()->syncWithoutDetaching([$catSnack->id]);

            $c3 = Promo::firstOrCreate(
                ['code' => 'PROMO-CAT-PERAWATAN'],
                [
                    'name' => 'Diskon 10% Perawatan Diri & Mandi',
                    'description' => 'Diskon 10% sabun, shampo, dan perlengkapan mandi santri',
                    'type' => 'category',
                    'scope' => 'item',
                    'discount_type' => 'percent',
                    'discount_value' => 10,
                    'max_discount' => 5000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 5,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($catPerawatan) $c3->categories()->syncWithoutDetaching([$catPerawatan->id]);

            // ═══════════════════════════════════════════════════════════════
            // 3. TYPE: BUNDLE (Paket Hemat / Bundling - 3 Items)
            // ═══════════════════════════════════════════════════════════════
            Promo::firstOrCreate(
                ['code' => 'PROMO-BUNDLE-SARAPAN'],
                [
                    'name' => 'Paket Sarapan Sehat (Roti & Susu)',
                    'description' => 'Beli paket sarapan hemat langsung dapat potongan Rp 2.500',
                    'type' => 'bundle',
                    'scope' => 'item',
                    'discount_type' => 'amount',
                    'discount_value' => 2500,
                    'min_qty' => 2,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 8,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );

            Promo::firstOrCreate(
                ['code' => 'PROMO-BUNDLE-MANDI'],
                [
                    'name' => 'Paket Bersih Santri (Sabun + Shampo)',
                    'description' => 'Paket bundling kebutuhan mandi lengkap hemat Rp 5.000',
                    'type' => 'bundle',
                    'scope' => 'item',
                    'discount_type' => 'amount',
                    'discount_value' => 5000,
                    'min_qty' => 3,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 7,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );

            Promo::firstOrCreate(
                ['code' => 'PROMO-BUNDLE-KOPI'],
                [
                    'name' => 'Paket Ngopi Santai (Kopi + Biskuit)',
                    'description' => 'Beli kopi sachet plus biskuit dapat potongan Rp 2.000',
                    'type' => 'bundle',
                    'scope' => 'item',
                    'discount_type' => 'amount',
                    'discount_value' => 2000,
                    'min_qty' => 2,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 6,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );

            // ═══════════════════════════════════════════════════════════════
            // 4. TYPE: BUY_X_GET_Y (Beli X Gratis Y - 3 Items)
            // ═══════════════════════════════════════════════════════════════
            $b1 = Promo::firstOrCreate(
                ['code' => 'PROMO-B2G1-TEHPUCUK'],
                [
                    'name' => 'Promo Beli 2 Gratis 1 Teh Pucuk',
                    'description' => 'Beli 2 botol Teh Pucuk Harum 350ml gratis 1 botol',
                    'type' => 'buy_x_get_y',
                    'scope' => 'item',
                    'discount_type' => 'free_item',
                    'discount_value' => 0,
                    'buy_qty' => 2,
                    'get_qty' => 1,
                    'get_product_id' => $tehPucuk?->id,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'quota_total' => 100,
                    'quota_per_member' => 2,
                    'priority' => 10,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($tehPucuk) $b1->products()->syncWithoutDetaching([$tehPucuk->id]);

            $b2 = Promo::firstOrCreate(
                ['code' => 'PROMO-B3G1-MIE'],
                [
                    'name' => 'Promo Beli 3 Gratis 1 Mie Instan',
                    'description' => 'Beli 3 bungkus mie instan favorit gratis 1 bungkus tambahan',
                    'type' => 'buy_x_get_y',
                    'scope' => 'item',
                    'discount_type' => 'free_item',
                    'discount_value' => 0,
                    'buy_qty' => 3,
                    'get_qty' => 1,
                    'get_product_id' => $mie?->id,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'quota_total' => 150,
                    'quota_per_member' => 2,
                    'priority' => 9,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($mie) $b2->products()->syncWithoutDetaching([$mie->id]);

            $b3 = Promo::firstOrCreate(
                ['code' => 'PROMO-B2G1-CHIKI'],
                [
                    'name' => 'Promo Beli 2 Gratis 1 Chiki Balls',
                    'description' => 'Beli 2 pack snack Chiki Balls gratis 1 pack Chiki',
                    'type' => 'buy_x_get_y',
                    'scope' => 'item',
                    'discount_type' => 'free_item',
                    'discount_value' => 0,
                    'buy_qty' => 2,
                    'get_qty' => 1,
                    'get_product_id' => $chiki?->id,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'quota_total' => 80,
                    'quota_per_member' => 1,
                    'priority' => 8,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($chiki) $b3->products()->syncWithoutDetaching([$chiki->id]);

            // ═══════════════════════════════════════════════════════════════
            // 5. TYPE: TIERED_QTY (Makin Banyak Makin Murah / Grosir - 3 Items)
            // ═══════════════════════════════════════════════════════════════
            $t1 = Promo::firstOrCreate(
                ['code' => 'PROMO-TIER-SNACK'],
                [
                    'name' => 'Grosir Snack Hemat (Min. 3 Pcs)',
                    'description' => 'Beli minimal 3 pcs snack dapat potongan bertingkat Rp 3.000',
                    'type' => 'tiered_qty',
                    'scope' => 'item',
                    'discount_type' => 'amount',
                    'discount_value' => 3000,
                    'min_qty' => 3,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 7,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($catSnack) $t1->categories()->syncWithoutDetaching([$catSnack->id]);

            $t2 = Promo::firstOrCreate(
                ['code' => 'PROMO-TIER-MINUMAN'],
                [
                    'name' => 'Grosir Minuman Segar (Min. 5 Pcs)',
                    'description' => 'Beli 5 botol minuman dapat potongan langsung Rp 5.000',
                    'type' => 'tiered_qty',
                    'scope' => 'item',
                    'discount_type' => 'amount',
                    'discount_value' => 5000,
                    'min_qty' => 5,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 7,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($catMinuman) $t2->categories()->syncWithoutDetaching([$catMinuman->id]);

            $t3 = Promo::firstOrCreate(
                ['code' => 'PROMO-TIER-ATK'],
                [
                    'name' => 'Grosir Buku & ATK Sekolah (Min. 10 Pcs)',
                    'description' => 'Beli 10 buku tulis sekolah dapat potongan harga grosir Rp 10.000',
                    'type' => 'tiered_qty',
                    'scope' => 'item',
                    'discount_type' => 'amount',
                    'discount_value' => 10000,
                    'min_qty' => 10,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 8,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($buku) $t3->products()->syncWithoutDetaching([$buku->id]);

            // ═══════════════════════════════════════════════════════════════
            // 6. TYPE: HAPPY_HOUR (Diskon Jam Tertentu / Flash Sale - 3 Items)
            // ═══════════════════════════════════════════════════════════════
            Promo::firstOrCreate(
                ['code' => 'PROMO-HAPPY-JUMAT'],
                [
                    'name' => 'Flash Sale Jumat Berkah (12.00 - 15.00)',
                    'description' => 'Potongan Rp 5.000 spesial setelah sholat Jumat untuk min. belanja Rp 50.000',
                    'type' => 'happy_hour',
                    'scope' => 'bill',
                    'discount_type' => 'amount',
                    'discount_value' => 5000,
                    'min_purchase' => 50000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'start_time' => '12:00:00',
                    'end_time' => '15:00:00',
                    'days_of_week' => [5], // Jumat
                    'priority' => 12,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );

            $hh2 = Promo::firstOrCreate(
                ['code' => 'PROMO-HAPPY-SORE'],
                [
                    'name' => 'Happy Hour Sore Jajan Santri (16.00 - 18.00)',
                    'description' => 'Diskon 10% aneka snack setiap sore hari',
                    'type' => 'happy_hour',
                    'scope' => 'item',
                    'discount_type' => 'percent',
                    'discount_value' => 10,
                    'max_discount' => 5000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'start_time' => '16:00:00',
                    'end_time' => '18:00:00',
                    'priority' => 11,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($catSnack) $hh2->categories()->syncWithoutDetaching([$catSnack->id]);

            $hh3 = Promo::firstOrCreate(
                ['code' => 'PROMO-HAPPY-MALAM'],
                [
                    'name' => 'Flash Sale Minuman Dingin Malam (19.00 - 21.00)',
                    'description' => 'Potongan Rp 2.000 minuman dingin setelah pengajian malam',
                    'type' => 'happy_hour',
                    'scope' => 'item',
                    'discount_type' => 'amount',
                    'discount_value' => 2000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'start_time' => '19:00:00',
                    'end_time' => '21:00:00',
                    'priority' => 10,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($catMinuman) $hh3->categories()->syncWithoutDetaching([$catMinuman->id]);

            // ═══════════════════════════════════════════════════════════════
            // 7. TYPE: CLEARANCE (Cuci Gudang / Habiskan Stok - 3 Items)
            // ═══════════════════════════════════════════════════════════════
            $cl1 = Promo::firstOrCreate(
                ['code' => 'PROMO-CLEAR-ATK'],
                [
                    'name' => 'Cuci Gudang Alat Tulis Sekolah Diskon 20%',
                    'description' => 'Habiskan stok perlengkapan sekolah dan buku tulis diskon 20%',
                    'type' => 'clearance',
                    'scope' => 'item',
                    'discount_type' => 'percent',
                    'discount_value' => 20,
                    'max_discount' => 10000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 15,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($catAtk) $cl1->categories()->syncWithoutDetaching([$catAtk->id]);

            $cl2 = Promo::firstOrCreate(
                ['code' => 'PROMO-CLEAR-DAPUR'],
                [
                    'name' => 'Cuci Gudang Peralatan Dapur Diskon 25%',
                    'description' => 'Potongan 25% perlengkapan makan dan dapur sisa stok',
                    'type' => 'clearance',
                    'scope' => 'item',
                    'discount_type' => 'percent',
                    'discount_value' => 25,
                    'max_discount' => 15000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 14,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($catDapur) $cl2->categories()->syncWithoutDetaching([$catDapur->id]);

            $cl3 = Promo::firstOrCreate(
                ['code' => 'PROMO-CLEAR-PAKAIAN'],
                [
                    'name' => 'Cuci Gudang Pakaian Santri Diskon 30%',
                    'description' => 'Spesial cuci gudang busana muslim dan sarung santri diskon 30%',
                    'type' => 'clearance',
                    'scope' => 'item',
                    'discount_type' => 'percent',
                    'discount_value' => 30,
                    'max_discount' => 25000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 13,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($catPakaian) $cl3->categories()->syncWithoutDetaching([$catPakaian->id]);

            // ═══════════════════════════════════════════════════════════════
            // 8. TYPE: MEMBER_LEVEL (Diskon Member Level - 3 Items)
            // ═══════════════════════════════════════════════════════════════
            $ml1 = Promo::firstOrCreate(
                ['code' => 'PROMO-LVL-FASILITATOR'],
                [
                    'name' => 'Apresiasi Fasilitator & Guru Diskon 5%',
                    'description' => 'Diskon otomatis 5% untuk semua pembelanjaan ustadz dan fasilitator',
                    'type' => 'member_level',
                    'scope' => 'bill',
                    'discount_type' => 'percent',
                    'discount_value' => 5,
                    'max_discount' => 25000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 10,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($lvlFasilitator) $ml1->memberLevels()->syncWithoutDetaching([$lvlFasilitator->id]);

            $ml2 = Promo::firstOrCreate(
                ['code' => 'PROMO-LVL-STAF'],
                [
                    'name' => 'Kesejahteraan Staf & Pengurus Pondok Diskon 7%',
                    'description' => 'Potongan 7% pembelanjaan untuk seluruh staf dan karyawan pondok',
                    'type' => 'member_level',
                    'scope' => 'bill',
                    'discount_type' => 'percent',
                    'discount_value' => 7,
                    'max_discount' => 30000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 10,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($lvlStaf) $ml2->memberLevels()->syncWithoutDetaching([$lvlStaf->id]);

            $ml3 = Promo::firstOrCreate(
                ['code' => 'PROMO-LVL-PRESTASI'],
                [
                    'name' => 'Apresiasi Santri Berprestasi Diskon 10%',
                    'description' => 'Diskon 10% setiap belanja khusus santri peraih prestasi',
                    'type' => 'member_level',
                    'scope' => 'bill',
                    'discount_type' => 'percent',
                    'discount_value' => 10,
                    'max_discount' => 50000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 12,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($lvlPrestasi) $ml3->memberLevels()->syncWithoutDetaching([$lvlPrestasi->id]);

            // ═══════════════════════════════════════════════════════════════
            // 9. TYPE: BIRTHDAY (Bonus Ulang Tahun - 3 Items)
            // ═══════════════════════════════════════════════════════════════
            $bd1 = Promo::firstOrCreate(
                ['code' => 'PROMO-BDAY-SANTRI'],
                [
                    'name' => 'Kado Milad Santri Hemat Rp 10.000',
                    'description' => 'Voucher hadiah belanja milad santri senilai Rp 10.000',
                    'type' => 'birthday',
                    'scope' => 'bill',
                    'discount_type' => 'amount',
                    'discount_value' => 10000,
                    'min_purchase' => 20000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 20,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($lvlSantri) $bd1->memberLevels()->syncWithoutDetaching([$lvlSantri->id]);

            $bd2 = Promo::firstOrCreate(
                ['code' => 'PROMO-BDAY-FASILITATOR'],
                [
                    'name' => 'Kado Milad Guru & Fasilitator Rp 25.000',
                    'description' => 'Voucher hadiah milad ustadz & fasilitator senilai Rp 25.000',
                    'type' => 'birthday',
                    'scope' => 'bill',
                    'discount_type' => 'amount',
                    'discount_value' => 25000,
                    'min_purchase' => 30000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 20,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($lvlFasilitator) $bd2->memberLevels()->syncWithoutDetaching([$lvlFasilitator->id]);

            $bd3 = Promo::firstOrCreate(
                ['code' => 'PROMO-BDAY-STAF'],
                [
                    'name' => 'Kado Milad Staf & Karyawan Rp 20.000',
                    'description' => 'Voucher hadiah milad staf pondok senilai Rp 20.000',
                    'type' => 'birthday',
                    'scope' => 'bill',
                    'discount_type' => 'amount',
                    'discount_value' => 20000,
                    'min_purchase' => 25000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 20,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            if ($lvlStaf) $bd3->memberLevels()->syncWithoutDetaching([$lvlStaf->id]);

            // ═══════════════════════════════════════════════════════════════
            // 10. KUPON BELANJA (3 Items)
            // ═══════════════════════════════════════════════════════════════
            Coupon::firstOrCreate(
                ['code' => 'KUPON-SANTRI10K'],
                [
                    'name' => 'Kupon Santri Hemat Rp 10.000',
                    'discount_type' => 'amount',
                    'discount_value' => 10000,
                    'min_purchase' => 50000,
                    'valid_from' => $validFrom,
                    'valid_until' => $validUntil,
                    'quota' => 100,
                    'used_count' => 0,
                    'per_member_limit' => 1,
                    'status' => 'active',
                    'source' => 'manual',
                    'created_by' => $adminId,
                ]
            );

            Coupon::firstOrCreate(
                ['code' => 'KUPON-HEMAT10'],
                [
                    'name' => 'Kupon Belanja Hemat 10%',
                    'discount_type' => 'percent',
                    'discount_value' => 10,
                    'max_discount' => 15000,
                    'min_purchase' => 30000,
                    'valid_from' => $validFrom,
                    'valid_until' => $validUntil,
                    'quota' => 150,
                    'used_count' => 0,
                    'per_member_limit' => 2,
                    'status' => 'active',
                    'source' => 'campaign',
                    'created_by' => $adminId,
                ]
            );

            Coupon::firstOrCreate(
                ['code' => 'KUPON-WEEKEND5K'],
                [
                    'name' => 'Kupon Flash Sale Rp 5.000',
                    'discount_type' => 'amount',
                    'discount_value' => 5000,
                    'min_purchase' => 25000,
                    'valid_from' => $validFrom,
                    'valid_until' => $validUntil,
                    'quota' => 200,
                    'used_count' => 0,
                    'per_member_limit' => 1,
                    'status' => 'active',
                    'source' => 'campaign',
                    'created_by' => $adminId,
                ]
            );

            // ═══════════════════════════════════════════════════════════════
            // 11. VOUCHER BELANJA (3 Items)
            // ═══════════════════════════════════════════════════════════════
            Coupon::firstOrCreate(
                ['code' => 'VOUCHER-SMART20K'],
                [
                    'name' => 'Voucher Belanja Skillage Mart Rp 20.000',
                    'discount_type' => 'amount',
                    'discount_value' => 20000,
                    'min_purchase' => 0,
                    'valid_from' => $validFrom,
                    'valid_until' => $now->copy()->addMonths(6),
                    'quota' => 50,
                    'used_count' => 0,
                    'per_member_limit' => 1,
                    'status' => 'active',
                    'source' => 'loyalty',
                    'created_by' => $adminId,
                ]
            );

            Coupon::firstOrCreate(
                ['code' => 'VOUCHER-SMART50K'],
                [
                    'name' => 'Voucher Belanja Skillage Mart Rp 50.000',
                    'discount_type' => 'amount',
                    'discount_value' => 50000,
                    'min_purchase' => 0,
                    'valid_from' => $validFrom,
                    'valid_until' => $now->copy()->addMonths(6),
                    'quota' => 30,
                    'used_count' => 0,
                    'per_member_limit' => 1,
                    'status' => 'active',
                    'source' => 'loyalty',
                    'created_by' => $adminId,
                ]
            );

            Coupon::firstOrCreate(
                ['code' => 'VOUCHER-REWARD15K'],
                [
                    'name' => 'Voucher Reward Santri Rp 15.000',
                    'discount_type' => 'amount',
                    'discount_value' => 15000,
                    'min_purchase' => 0,
                    'valid_from' => $validFrom,
                    'valid_until' => $now->copy()->addMonths(6),
                    'quota' => 50,
                    'used_count' => 0,
                    'per_member_limit' => 1,
                    'status' => 'active',
                    'source' => 'birthday',
                    'created_by' => $adminId,
                ]
            );

            DB::commit();
            $this->command?->info('Berhasil melakukan seeding 27 Promo (3 untuk setiap 9 jenis promo), 3 Kupon, dan 3 Voucher.');
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->command?->error('Gagal seeding: ' . $e->getMessage());
            throw $e;
        }
    }
}
