<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Fase 17-Darurat (temuan audit lintas-fase) — kepatuhan data pribadi
 * anak minimum (UU PDP 27/2022): `phone`/`address`/`guardian_phone`
 * dienkripsi at-rest (Model::casts() 'encrypted', lihat Member.php).
 * `phone`/`guardian_phone` diperlebar ke TEXT karena ciphertext
 * (AES-256-CBC + HMAC + base64) jauh lebih panjang dari string(20)
 * asli. `nis` dan `guardians.phone` SENGAJA TIDAK dienkripsi — Laravel
 * encrypted cast pakai IV acak per panggilan (non-deterministik),
 * sehingga kolom yang dipakai untuk WHERE/LIKE/lookup (nis dicari via
 * LIKE, guardians.phone dipakai Auth::attempt()) akan RUSAK TOTAL bila
 * dienkripsi — nilai plaintext yang sama menghasilkan ciphertext beda
 * tiap kali disimpan, tidak bisa dicocokkan lagi lewat query. Sama
 * halnya `birth_date` (dipakai whereMonth/whereDay untuk bonus/
 * notifikasi ulang tahun) TIDAK disentuh.
 */
return new class extends Migration
{
    /**
     * SQL mentah, bukan Blueprint::change() — menghindari dependency
     * doctrine/dbal yang belum ter-install cuma untuk satu ALTER TYPE
     * kecil ini.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE members MODIFY phone TEXT NULL');
        DB::statement('ALTER TABLE members MODIFY guardian_phone TEXT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE members MODIFY phone VARCHAR(20) NULL');
        DB::statement('ALTER TABLE members MODIFY guardian_phone VARCHAR(20) NULL');
    }
};
