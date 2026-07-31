<?php

namespace Database\Seeders;

use App\Models\MemberLevel;
use Illuminate\Database\Seeder;

class MemberLevelSeeder extends Seeder
{
    public function run(): void
    {
        $levels = [
            ['code' => 'SANTRI', 'name' => 'Santri', 'discount_percent' => 0, 'point_multiplier' => 1, 'color' => 'navy', 'is_default' => true],
            ['code' => 'FASILITATOR', 'name' => 'Fasilitator', 'discount_percent' => 5, 'point_multiplier' => 1.5, 'color' => 'teal'],
            ['code' => 'STAF', 'name' => 'Staf', 'discount_percent' => 5, 'point_multiplier' => 1.5, 'color' => 'teal'],
            ['code' => 'UMUM', 'name' => 'Umum', 'discount_percent' => 0, 'point_multiplier' => 1, 'color' => 'slate'],
            ['code' => 'SANTRI_BERPRESTASI', 'name' => 'Santri Berprestasi', 'min_spending' => 500000, 'discount_percent' => 10, 'point_multiplier' => 2, 'color' => 'gold'],
        ];

        foreach ($levels as $level) {
            MemberLevel::firstOrCreate(['code' => $level['code']], [...$level, 'is_active' => true]);
        }
    }
}
