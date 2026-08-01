<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 17-Darurat (temuan audit lintas-fase, bukan tiket resmi) —
 * kepatuhan data pribadi anak minimum (UU PDP 27/2022):
 * - `guardians` belum pakai SoftDeletes sama sekali (beda dari
 *   `Member` yang sudah sejak Fase 3) — riwayat approval top-up bisa
 *   kehilangan integritas referensial kalau akun wali dihapus.
 * - `guardian_member.consent_given_at`: representasi consent
 *   terdokumentasi saat admin menghubungkan wali ke anak (bukan flow
 *   consent-eksplisit-oleh-wali-sendiri, karena akun dibuat admin,
 *   bukan self-registrasi — dicatat apa adanya sebagai timestamp
 *   linking, bukan tanda tangan digital).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guardians', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('guardian_member', function (Blueprint $table) {
            $table->timestamp('consent_given_at')->nullable()->after('is_primary');
        });
    }

    public function down(): void
    {
        Schema::table('guardians', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('guardian_member', function (Blueprint $table) {
            $table->dropColumn('consent_given_at');
        });
    }
};
