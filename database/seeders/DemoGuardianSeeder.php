<?php

namespace Database\Seeders;

use App\Models\Guardian;
use App\Models\Member;
use Illuminate\Database\Seeder;

/**
 * Seed demo Guardian for Owner Switch Role preview feature.
 * Guardian ini digunakan owner untuk preview tampilan Portal Wali
 * tanpa perlu akun guardian nyata — login otomatis via PIN owner.
 */
class DemoGuardianSeeder extends Seeder
{
    public function run(): void
    {
        $guardian = Guardian::firstOrCreate(
            ['phone' => '000000000000'],
            [
                'name'      => 'Demo Wali (Owner Preview)',
                'email'     => 'demowali@skillagemart.test',
                'password'  => '123456',
                'relation'  => 'Demo',
                'is_active' => true,
            ]
        );

        $members = Member::take(2)->get();
        foreach ($members as $member) {
            if (!$guardian->members()->where('member_id', $member->id)->exists()) {
                $guardian->members()->attach($member->id, [
                    'is_primary' => true,
                    'consent_given_at' => now(),
                ]);
            }
        }
    }
}
