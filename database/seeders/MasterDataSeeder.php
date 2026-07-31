<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Outlet;
use App\Models\PaymentMethod;
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

        $paymentMethods = [
            ['code' => 'CASH', 'name' => 'Tunai', 'type' => 'cash', 'allows_change' => true],
            ['code' => 'DEPOSIT', 'name' => 'Saldo Deposit', 'type' => 'deposit'],
            ['code' => 'QRIS', 'name' => 'QRIS', 'type' => 'qris', 'requires_reference' => true],
            ['code' => 'TRANSFER', 'name' => 'Transfer', 'type' => 'transfer', 'requires_reference' => true],
            ['code' => 'DEBIT', 'name' => 'Kartu Debit', 'type' => 'card', 'requires_reference' => true],
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
