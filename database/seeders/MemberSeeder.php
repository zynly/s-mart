<?php

namespace Database\Seeders;

use App\Models\Member;
use App\Models\MemberLevel;
use App\Services\MemberService;
use Illuminate\Database\Seeder;

class MemberSeeder extends Seeder
{
    private const SANTRI = [
        ['nis' => '2260001', 'name' => 'Ahmad Fauzan Ridho', 'class' => 'XI', 'major' => 'PPLG', 'gender' => 'L'],
        ['nis' => '2260002', 'name' => 'Muhammad Rizky Ramadhan', 'class' => 'XI', 'major' => 'PPLG', 'gender' => 'L'],
        ['nis' => '2260003', 'name' => 'Siti Nur Azizah', 'class' => 'XI', 'major' => 'TKP', 'gender' => 'P'],
        ['nis' => '2260004', 'name' => 'Fatimah Az-Zahra', 'class' => 'XI', 'major' => 'TKP', 'gender' => 'P'],
        ['nis' => '2260005', 'name' => 'Abdullah Hafiz Pratama', 'class' => 'X', 'major' => 'UPT', 'gender' => 'L'],
        ['nis' => '2260006', 'name' => 'Khoirunnisa Salsabila', 'class' => 'X', 'major' => 'UPT', 'gender' => 'P'],
        ['nis' => '2260007', 'name' => 'Yusuf Al-Ghifari', 'class' => 'X', 'major' => 'BISDIG', 'gender' => 'L'],
        ['nis' => '2260008', 'name' => 'Aisyah Putri Maharani', 'class' => 'X', 'major' => 'BISDIG', 'gender' => 'P'],
        ['nis' => '2260009', 'name' => 'Ibrahim Al-Fatih', 'class' => 'XII', 'major' => 'PPLG', 'gender' => 'L'],
        ['nis' => '2260010', 'name' => 'Zahra Kamila Husna', 'class' => 'XII', 'major' => 'PPLG', 'gender' => 'P'],
    ];

    public function __construct(private readonly MemberService $memberService) {}

    public function run(): void
    {
        $levelId = MemberLevel::where('code', 'SANTRI')->value('id');

        foreach (self::SANTRI as $santri) {
            if (Member::where('nis', $santri['nis'])->exists()) {
                continue;
            }

            $this->memberService->create([
                'name' => $santri['name'],
                'nis' => $santri['nis'],
                'member_level_id' => $levelId,
                'type' => 'santri',
                'class_name' => $santri['class'],
                'major' => $santri['major'],
                'entry_year' => 2026,
                'gender' => $santri['gender'],
                'status' => 'active',
                'joined_at' => '2026-07-13',
            ]);
        }
    }
}
