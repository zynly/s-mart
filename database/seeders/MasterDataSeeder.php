<?php

namespace Database\Seeders;

use App\Models\CashAccount;
use App\Models\CashCategory;
use App\Models\Category;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Supplier;
use App\Models\Unit;
use Illuminate\Database\Seeder;

class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        Outlet::firstOrCreate(
            ['code' => 'SKM'],
            ['name' => 'Skillage Mart', 'is_main' => true, 'is_active' => true],
        );

        $units = [
            ['code' => 'PCS', 'name' => 'Pieces'],
            ['code' => 'DUS', 'name' => 'Dus'],
            ['code' => 'PAK', 'name' => 'Pak'],
            ['code' => 'BOX', 'name' => 'Box'],
            ['code' => 'KG', 'name' => 'Kilogram'],
            ['code' => 'LITER', 'name' => 'Liter'],
            ['code' => 'RENCENG', 'name' => 'Renceng'],
        ];

        foreach ($units as $unit) {
            Unit::firstOrCreate(['code' => $unit['code']], $unit);
        }

        $categories = [
            'Makanan Ringan', 'Minuman', 'Sembako', 'Alat Tulis',
            'Perlengkapan Mandi', 'Obat-obatan', 'Lain-lain',
        ];

        foreach ($categories as $index => $name) {
            Category::firstOrCreate(
                ['code' => 'CAT-'.str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT)],
                ['name' => $name, 'is_active' => true],
            );
        }

        $suppliers = [
            ['code' => 'SUP-01', 'name' => 'Toko Grosir Jaya', 'contact_person' => 'Pak Hendra', 'phone' => '081234567001', 'payment_term_days' => 30, 'is_consignor' => false],
            ['code' => 'SUP-02', 'name' => 'CV Sumber Rejeki', 'contact_person' => 'Bu Sri', 'phone' => '081234567002', 'payment_term_days' => 14, 'is_consignor' => false],
            ['code' => 'SUP-03', 'name' => 'Warung Kue Ibu Ani', 'contact_person' => 'Bu Ani', 'phone' => '081234567003', 'payment_term_days' => 0, 'is_consignor' => true],
        ];

        foreach ($suppliers as $supplier) {
            Supplier::firstOrCreate(
                ['code' => $supplier['code']],
                [...$supplier, 'is_active' => true],
            );
        }

        $outletId = Outlet::where('code', 'SKM')->value('id');

        $cashAccounts = [
            ['code' => 'LACI-1', 'name' => 'Laci Kasir 1', 'type' => 'cash', 'is_drawer' => true, 'is_default' => true],
            ['code' => 'LACI-2', 'name' => 'Laci Kasir 2', 'type' => 'cash', 'is_drawer' => true],
            ['code' => 'LACI-3', 'name' => 'Laci Kasir 3', 'type' => 'cash', 'is_drawer' => true],
            ['code' => 'BRANKAS', 'name' => 'Brankas Utama', 'type' => 'cash', 'is_drawer' => false],
            ['code' => 'BANK-BCA', 'name' => 'Bank BCA', 'type' => 'bank', 'bank_name' => 'BCA', 'account_number' => '1234567890', 'account_holder' => 'Skillage Mart', 'is_drawer' => false],
        ];

        foreach ($cashAccounts as $account) {
            $cashAccount = CashAccount::firstOrCreate(
                ['code' => $account['code']],
                [...$account, 'outlet_id' => $outletId, 'opening_balance' => 0, 'is_active' => true],
            );

            if ($cashAccount->wasRecentlyCreated) {
                $cashAccount->forceFill(['current_balance' => 0])->save();
            }
        }

        $cashCategories = [
            // account_code dipetakan di Fase 13 §Temuan L (kolom sudah ada
            // sejak Fase 7, komentar migration eksplisit "dipetakan saat
            // Fase 13 dibangun" — dipakai CashTransactionObserver untuk kas
            // masuk/keluar MANUAL lewat CashController, bukan kas yang
            // sudah dijurnal observer lain lewat sourceable_type).
            ['code' => 'PENJUALAN', 'name' => 'Penjualan', 'type' => 'in', 'is_system' => true, 'account_code' => '4-1000'],
            ['code' => 'TOPUP', 'name' => 'Top-Up Deposit', 'type' => 'in', 'is_system' => true, 'account_code' => '2-1200'],
            ['code' => 'PELUNASAN', 'name' => 'Pelunasan Piutang', 'type' => 'in', 'is_system' => true, 'account_code' => '1-1500'],
            ['code' => 'MODAL', 'name' => 'Setoran Modal', 'type' => 'in', 'account_code' => '3-1000'],
            ['code' => 'BELANJA_OPS', 'name' => 'Belanja Operasional', 'type' => 'out', 'account_code' => '6-1800'],
            ['code' => 'BAYAR_HUTANG', 'name' => 'Pembayaran Hutang', 'type' => 'out', 'is_system' => true, 'account_code' => '2-1100'],
            ['code' => 'GAJI', 'name' => 'Gaji/Honor', 'type' => 'out', 'account_code' => '6-1700'],
            ['code' => 'LAIN_LAIN', 'name' => 'Lain-lain', 'type' => 'out', 'account_code' => '6-1900'],
        ];

        foreach ($cashCategories as $category) {
            CashCategory::firstOrCreate(
                ['code' => $category['code']],
                [...$category, 'is_system' => $category['is_system'] ?? false, 'is_active' => true],
            );
        }

        $bankAccountId = CashAccount::where('code', 'BANK-BCA')->value('id');

        $paymentMethods = [
            ['code' => 'CASH', 'name' => 'Tunai', 'type' => 'cash', 'allows_change' => true],
            ['code' => 'DEPOSIT', 'name' => 'Saldo Deposit', 'type' => 'deposit'],
            ['code' => 'QRIS', 'name' => 'QRIS', 'type' => 'qris', 'requires_reference' => true, 'cash_account_id' => $bankAccountId, 'mdr_percent' => 0.7],
            ['code' => 'EWALLET', 'name' => 'E-Wallet', 'type' => 'ewallet', 'requires_reference' => true, 'cash_account_id' => $bankAccountId, 'mdr_percent' => 1.5],
            ['code' => 'TRANSFER', 'name' => 'Transfer', 'type' => 'transfer', 'requires_reference' => true, 'cash_account_id' => $bankAccountId],
            ['code' => 'DEBIT', 'name' => 'Kartu Debit', 'type' => 'card', 'requires_reference' => true, 'cash_account_id' => $bankAccountId, 'mdr_percent' => 0.15],
            ['code' => 'VOUCHER', 'name' => 'Voucher', 'type' => 'voucher'],
            ['code' => 'POINT', 'name' => 'Poin', 'type' => 'point'],
            ['code' => 'CREDIT', 'name' => 'Kredit/Tempo', 'type' => 'credit'],
            ['code' => 'PAYROLL', 'name' => 'Potong Gaji', 'type' => 'payroll'],
        ];

        foreach ($paymentMethods as $sort => $method) {
            PaymentMethod::firstOrCreate(
                ['code' => $method['code']],
                [...$method, 'sort_order' => $sort],
            );
        }
    }
}
