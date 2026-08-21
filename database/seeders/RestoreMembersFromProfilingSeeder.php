<?php

namespace Database\Seeders;

use App\Models\DepositTransaction;
use App\Models\Member;
use App\Models\MemberLevel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use PDO;

class RestoreMembersFromProfilingSeeder extends Seeder
{
    public function run(): void
    {
        $santriLevel = MemberLevel::where('code', 'SANTRI')->first();
        $fasilLevel = MemberLevel::where('code', 'FASILITATOR')->first();

        if (! $santriLevel || ! $fasilLevel) {
            $this->command?->error('Level SANTRI atau FASILITATOR tidak ditemukan.');
            return;
        }

        // ───────────────────────────────────────────────
        // 1. KONEKSI KE NEON DB PROFILING-SKILLAGE
        // ───────────────────────────────────────────────
        try {
            $neon = new PDO(
                "pgsql:host=ep-round-block-az4umrb4-pooler.c-3.ap-southeast-1.aws.neon.tech;port=5432;dbname=neondb;sslmode=require",
                "neondb_owner",
                "npg_6vV3TotWQZnz",
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
        } catch (\Throwable $e) {
            $this->command?->error("Gagal terhubung ke database Profiling Neon: " . $e->getMessage());
            return;
        }

        // ───────────────────────────────────────────────
        // 2. AMBIL SALDO E-MONEY DARI NEON
        // ───────────────────────────────────────────────
        $emoneyMap = [];
        try {
            $emoneyRows = $neon->query("SELECT nis, saldo FROM emoney_santri")->fetchAll(PDO::FETCH_ASSOC);
            foreach ($emoneyRows as $er) {
                if (!empty($er['nis'])) {
                    $emoneyMap[trim($er['nis'])] = (float) ($er['saldo'] ?? 0);
                }
            }
        } catch (\Throwable) {
            // Abaikan jika tabel tidak terbaca
        }

        // ───────────────────────────────────────────────
        // 3. SEED 122 SANTRI
        // ───────────────────────────────────────────────
        $santriRows = $neon->query("SELECT * FROM master_santri ORDER BY nis ASC")->fetchAll(PDO::FETCH_ASSOC);
        $santriCount = 0;

        foreach ($santriRows as $s) {
            $nis = trim($s['nis'] ?? '');
            $nama = trim($s['nama_lengkap'] ?? '');
            if (empty($nis) || empty($nama)) {
                continue;
            }

            $saldo = $emoneyMap[$nis] ?? 0;
            $memberNumber = '2026' . str_pad($nis, 7, '0', STR_PAD_LEFT);
            $gender = strtoupper(trim($s['jenis_kelamin'] ?? 'L'));
            $gender = in_array($gender, ['L', 'P'], true) ? $gender : 'L';

            $member = Member::updateOrCreate(
                ['nis' => $nis],
                [
                    'name' => $nama,
                    'member_number' => $memberNumber,
                    'type' => 'santri',
                    'member_level_id' => $santriLevel->id,
                    'class_name' => $s['kelas'] ?? $s['semester'] ?? 'X',
                    'major' => $s['jurusan'] ?? $s['program_keahlian'] ?? '-',
                    'entry_year' => !empty($s['tahun_masuk']) ? (int) $s['tahun_masuk'] : 2026,
                    'gender' => $gender,
                    'phone' => !empty($s['no_hp']) ? trim($s['no_hp']) : null,
                    'address' => !empty($s['alamat']) ? trim($s['alamat']) : null,
                    'balance_cache' => 0, // Default 0
                    'point_balance' => 0, // Default 0
                    'receivable_limit' => 0, // SANTRI MUTLAK LIMIT 0 (DILARANG KREDIT)
                    'pin' => Hash::make('123456'), // DEFAULT PIN 123456
                    'status' => 'active',
                    'joined_at' => now()->toDateString(),
                ]
            );

            $santriCount++;
        }

        // ───────────────────────────────────────────────
        // 4. SEED FASILITATOR (USTADZ / GURU)
        // ───────────────────────────────────────────────
        // Ambil dari master_staf di Neon DB
        $stafRows = $neon->query("SELECT * FROM master_staf ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
        $fasilCount = 0;

        foreach ($stafRows as $st) {
            $nama = trim($st['nama'] ?? '');
            if (empty($nama)) {
                continue;
            }

            $phone = !empty($st['no_hp']) ? trim($st['no_hp']) : null;
            $memberNumber = 'FASIL-' . str_pad((string) ($st['id'] ?? ($fasilCount + 1)), 4, '0', STR_PAD_LEFT);

            // Cek apakah sudah terdaftar
            $exists = Member::where('name', $nama)->orWhere(function ($q) use ($phone) {
                if ($phone) {
                    $q->where('phone', $phone);
                }
            })->exists();

            if (! $exists) {
                Member::create([
                    'name' => $nama,
                    'member_number' => $memberNumber,
                    'type' => 'fasilitator',
                    'member_level_id' => $fasilLevel->id,
                    'gender' => 'L',
                    'phone' => $phone,
                    'balance_cache' => 0,
                    'point_balance' => 0,
                    'receivable_limit' => 1000000, // Limit Rp 1.000.000 untuk Fasilitator
                    'pin' => Hash::make('123456'), // DEFAULT PIN 123456
                    'status' => 'active',
                    'joined_at' => now()->toDateString(),
                ]);
                $fasilCount++;
            }
        }

        // Ambil Ustadz dari POS-OLD.sql jika belum ada
        $posOldFile = 'C:/Pak-Hakim/Worker/Dokumen Arsip/Skill Village/POS-OLD.sql';
        if (file_exists($posOldFile)) {
            $posContent = file_get_contents($posOldFile);
            if (preg_match('/INSERT INTO `memberships` \((.*?)\) VALUES\s*(.*?);/s', $posContent, $mMatch)) {
                preg_match_all('/\(([0-9]+),\s*\'(.*?)\',\s*(NULL|\'.*?\'),\s*(NULL|\'.*?\'),\s*(NULL|\'.*?\'),\s*(NULL|\'.*?\'),\s*([0-9]+)/', $mMatch[2], $rows, PREG_SET_ORDER);
                foreach ($rows as $r) {
                    $oldName = stripslashes(trim($r[2]));
                    $oldPhone = $r[5] !== 'NULL' ? trim($r[5], "'") : null;
                    $oldPoints = (int) $r[7];

                    $member = Member::where('name', $oldName)->first();
                    if (! $member) {
                        Member::create([
                            'name' => $oldName,
                            'member_number' => 'FASIL-OLD-' . str_pad($r[1], 3, '0', STR_PAD_LEFT),
                            'type' => 'fasilitator',
                            'member_level_id' => $fasilLevel->id,
                            'gender' => 'L',
                            'phone' => $oldPhone,
                            'balance_cache' => 0,
                            'point_balance' => 0,
                            'receivable_limit' => 1000000,
                            'pin' => Hash::make('123456'),
                            'status' => 'active',
                            'joined_at' => now()->toDateString(),
                        ]);
                        $fasilCount++;
                    }
                }
            }
        }

        $this->command?->info("RestoreMembersFromProfilingSeeder Selesai: {$santriCount} Santri & {$fasilCount} Fasilitator/Guru berhasil disinkronkan.");
    }
}
