<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class ReferenceGenerator
{
    private const MEMBER_TYPE_PREFIXES = [
        'santri' => '',
        'fasilitator' => 'F',
        'staff' => 'S',
        'public' => 'U',
    ];

    private const MEMBER_COUNTER_KEYS = [
        'santri' => 'mbr-str',
        'fasilitator' => 'mbr-fas',
        'staff' => 'mbr-stf',
        'public' => 'mbr-pub',
    ];

    /**
     * $outletId TIDAK dipakai sebagai kunci counter — counter dibuat
     * global per prefix+tanggal (sentinel outlet_id=0), bukan per
     * outlet. Alasan: setiap tabel `reference` di aplikasi ini unique
     * secara GLOBAL (bukan per-outlet), padahal counter lama
     * dipisah per-outlet — begitu ada 2 outlet aktif, keduanya bisa
     * menghasilkan reference string yang identik di hari yang sama
     * (SO-20260731-0001 dobel, dst) dan gagal insert. Baru ketahuan
     * di Fase 12 (Transfer Stok — fitur pertama yang benar-benar
     * menyentuh 2 outlet sekaligus). Tidak berdampak ke data lama:
     * dengan 1 outlet, counter global = counter per-outlet, sama
     * persis. Parameter $outletId dipertahankan (tidak dipakai) supaya
     * semua pemanggil lama di 11 fase sebelumnya tidak perlu diubah.
     */
    public static function generate(string $prefix, int $outletId): string
    {
        $date = now()->format('Ymd');
        $lastNumber = self::increment($prefix, 0, $date);

        return sprintf('%s-%s-%04d', $prefix, $date, $lastNumber);
    }

    /**
     * Nomor anggota otomatis, aman dari race condition, bisa
     * penomoran ulang per angkatan (entry_year).
     *
     * santri (tanpa prefiks huruf): tahun(4) + urut(5) → 202600001
     * fasilitator/staff/public: huruf + tahun(4) + urut(4) → F20260001
     */
    public static function generateMemberNumber(string $type, int $entryYear): string
    {
        $letter = self::MEMBER_TYPE_PREFIXES[$type] ?? 'U';
        $counterKey = self::MEMBER_COUNTER_KEYS[$type] ?? 'mbr-pub';
        $year = (string) $entryYear;

        $lastNumber = self::increment($counterKey, 0, $year);

        return $letter === ''
            ? sprintf('%d%05d', $entryYear, $lastNumber)
            : sprintf('%s%d%04d', $letter, $entryYear, $lastNumber);
    }

    /**
     * Temuan audit performa (Phase C, CRITICAL): sebelumnya
     * `DB::transaction()` di sini SELALU nested di dalam transaksi
     * pemanggil (mis. `SaleService::complete()`) — Laravel cuma bikin
     * SAVEPOINT, row lock `reference_counters` tertahan sampai
     * SELURUH transaksi checkout selesai (bisa ratusan ms). Karena
     * counter dibuat global (outlet_id=0, lihat komentar `generate()`),
     * SEMUA kasir antre satu per satu di titik ini — SATU-SATUNYA
     * temuan yang membuat "30 concurrent user" (ADR-0008) tidak
     * tercapai berapa pun cepatnya query lain.
     *
     * Fix: koneksi `reference_counters` yang TERPISAH (PDO independen,
     * lihat config/database.php) + `INSERT ... ON DUPLICATE KEY UPDATE`
     * atomik (pola standar MySQL untuk counter bersaing tinggi), lalu
     * `SELECT` nilai barunya DALAM transaksi yang sama. Aman dari race
     * kondisi — InnoDB menjamin "read your own writes": SELECT biasa
     * (tanpa FOR UPDATE) di transaksi yang sama SELALU melihat
     * perubahan sendiri yang belum di-commit, dan transaksi lain yang
     * mencoba UPDATE baris yang sama otomatis diblokir sampai baris
     * ini commit — tidak mungkin dua transaksi membaca nilai counter
     * yang sama. (Catatan: sengaja TIDAK pakai `LAST_INSERT_ID(expr)`
     * untuk membaca nilai baru — tabel ini juga punya `id` auto-
     * increment sendiri yang selalu "menang" mengisi
     * `LAST_INSERT_ID()` untuk baris yang benar-benar baru, membuat
     * trik itu mengembalikan nilai yang salah.) Transaksi counter jadi
     * top-level SENDIRI — commit dalam hitungan milidetik, tidak ikut
     * menunggu transaksi checkout.
     *
     * SQL upsert-nya sengaja dicabang per driver (BUKAN cuma dialek
     * MySQL) — `phpunit.xml` (T-105) menjalankan test suite di atas
     * SQLite in-memory, dan koneksi `reference_counters` sengaja ikut
     * driver aktif (lihat `config/database.php`) supaya test tidak
     * perlu MySQL sungguhan. `ON DUPLICATE KEY UPDATE` (MySQL) dan
     * `ON CONFLICT ... DO UPDATE` (SQLite, didukung sejak 3.24) sama-
     * sama upsert atomik native — bukan emulasi rawan race.
     */
    private static function increment(string $prefix, int $outletId, string $dateKey): int
    {
        $connection = DB::connection('reference_counters');
        $now = now();

        return $connection->transaction(function () use ($connection, $prefix, $outletId, $dateKey, $now) {
            $sql = $connection->getDriverName() === 'sqlite'
                ? 'INSERT INTO reference_counters (prefix, outlet_id, date, last_number, created_at, updated_at)
                   VALUES (?, ?, ?, 1, ?, ?)
                   ON CONFLICT(prefix, outlet_id, date) DO UPDATE SET last_number = last_number + 1, updated_at = excluded.updated_at'
                : 'INSERT INTO reference_counters (prefix, outlet_id, date, last_number, created_at, updated_at)
                   VALUES (?, ?, ?, 1, ?, ?)
                   ON DUPLICATE KEY UPDATE last_number = last_number + 1, updated_at = ?';

            $bindings = $connection->getDriverName() === 'sqlite'
                ? [$prefix, $outletId, $dateKey, $now, $now]
                : [$prefix, $outletId, $dateKey, $now, $now, $now];

            $connection->statement($sql, $bindings);

            return (int) $connection->selectOne(
                'SELECT last_number FROM reference_counters WHERE prefix = ? AND outlet_id = ? AND date = ?',
                [$prefix, $outletId, $dateKey]
            )->last_number;
        });
    }
}
