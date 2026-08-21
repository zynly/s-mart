<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Coupon;
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
            // ───────────────────────────────────────────────
            // 1. SEED 3 PROMO (Promosi Toko / Event)
            // ───────────────────────────────────────────────
            $tehPucuk = Product::where('name', 'ilike', '%teh pucuk%')->first();
            $getProdId = $tehPucuk ? $tehPucuk->id : null;

            // Promo 1: Beli 2 Gratis 1
            $promo1 = Promo::firstOrCreate(
                ['code' => 'PROMO-TEH2GRATIS1'],
                [
                    'name' => 'Promo Beli 2 Gratis 1 Teh Pucuk',
                    'description' => 'Beli 2 botol Teh Pucuk Harum 350ml gratis 1 botol',
                    'type' => 'buy_x_get_y',
                    'scope' => 'item',
                    'discount_type' => 'free_item',
                    'discount_value' => 0,
                    'buy_qty' => 2,
                    'get_qty' => 1,
                    'get_product_id' => $getProdId,
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
            if ($tehPucuk) {
                $promo1->products()->syncWithoutDetaching([$tehPucuk->id]);
            }

            // Promo 2: Promo Snack Hemat Min 3 Pcs
            $promo2 = Promo::firstOrCreate(
                ['code' => 'PROMO-SNACK-BUNDLE'],
                [
                    'name' => 'Promo Snack Hemat Sore',
                    'description' => 'Potongan langsung Rp 3.000 untuk pembelian snack minimal 3 pcs',
                    'type' => 'tiered_qty',
                    'scope' => 'item',
                    'discount_type' => 'amount',
                    'discount_value' => 3000,
                    'min_qty' => 3,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'quota_total' => 100,
                    'quota_per_member' => 3,
                    'priority' => 5,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            $snackCats = Category::whereIn('id', [1, 9])->pluck('id')->toArray();
            if (!empty($snackCats)) {
                $promo2->categories()->syncWithoutDetaching($snackCats);
            }

            // Promo 3: Promo Transaksi Min Belanja Rp 50.000
            $promo3 = Promo::firstOrCreate(
                ['code' => 'PROMO-JUMAT-BERKAH'],
                [
                    'name' => 'Promo Belanja Berkah Rp 5.000',
                    'description' => 'Potongan Rp 5.000 untuk total transaksi belanja minimal Rp 50.000',
                    'type' => 'product',
                    'scope' => 'bill',
                    'discount_type' => 'amount',
                    'discount_value' => 5000,
                    'min_purchase' => 50000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'quota_total' => 200,
                    'quota_per_member' => 1,
                    'priority' => 8,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );

            // ───────────────────────────────────────────────
            // 2. SEED 3 DISKON (Diskon Langsung Produk / Kategori)
            // ───────────────────────────────────────────────
            // Diskon 1: Diskon 10% Sembako
            $diskon1 = Promo::firstOrCreate(
                ['code' => 'DISKON-SEMBAKO10'],
                [
                    'name' => 'Diskon Sembako Hemat 10%',
                    'description' => 'Diskon 10% untuk Beras, Minyak Goreng, dan Gula Pasir',
                    'type' => 'product',
                    'scope' => 'item',
                    'discount_type' => 'percent',
                    'discount_value' => 10,
                    'max_discount' => 10000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 6,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            $sembakoProds = Product::where('name', 'ilike', '%beras%')
                ->orWhere('name', 'ilike', '%minyak%')
                ->orWhere('name', 'ilike', '%gula%')
                ->take(5)
                ->pluck('id')
                ->toArray();
            if (!empty($sembakoProds)) {
                $diskon1->products()->syncWithoutDetaching($sembakoProds);
            }

            // Diskon 2: Diskon Rp 1.000 Minuman
            $diskon2 = Promo::firstOrCreate(
                ['code' => 'DISKON-MINUMAN1000'],
                [
                    'name' => 'Diskon Minuman Dingin Rp 1.000',
                    'description' => 'Potongan langsung Rp 1.000 untuk setiap botol minuman segar',
                    'type' => 'category',
                    'scope' => 'item',
                    'discount_type' => 'amount',
                    'discount_value' => 1000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 4,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            $drinkCats = Category::whereIn('id', [2, 26])->pluck('id')->toArray();
            if (!empty($drinkCats)) {
                $diskon2->categories()->syncWithoutDetaching($drinkCats);
            }

            // Diskon 3: Diskon 15% Clearance ATK
            $diskon3 = Promo::firstOrCreate(
                ['code' => 'DISKON-ATK15'],
                [
                    'name' => 'Diskon Spesial Alat Tulis 15%',
                    'description' => 'Diskon 15% perlengkapan sekolah dan buku tulis',
                    'type' => 'clearance',
                    'scope' => 'item',
                    'discount_type' => 'percent',
                    'discount_value' => 15,
                    'max_discount' => 5000,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'priority' => 3,
                    'is_public' => true,
                    'is_active' => true,
                    'created_by' => $adminId,
                ]
            );
            $atkCats = Category::whereIn('id', [4, 17])->pluck('id')->toArray();
            if (!empty($atkCats)) {
                $diskon3->categories()->syncWithoutDetaching($atkCats);
            }

            // ───────────────────────────────────────────────
            // 3. SEED 3 KUPON (Kupon Belanja / Coupon Code)
            // ───────────────────────────────────────────────
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

            // ───────────────────────────────────────────────
            // 4. SEED 3 VOUCHER (Voucher Belanja / Reward Voucher)
            // ───────────────────────────────────────────────
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
            $this->command?->info('Berhasil melakukan seeding 3 Promo, 3 Diskon, 3 Kupon, dan 3 Voucher.');
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->command?->error('Gagal seeding: ' . $e->getMessage());
            throw $e;
        }
    }
}
