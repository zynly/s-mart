<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 17-Darurat (temuan audit lintas-fase, bukan tiket resmi):
 * approve() top-up wali sebelumnya murni "percaya foto" — tidak ada
 * langkah yang memaksa admin mencocokkan dengan mutasi rekening koran
 * sungguhan sebelum saldo bertambah permanen. Kolom ini menandai siapa
 * & kapan verifikasi itu dilakukan, dipisah dari `verified_by`/
 * `verified_at` yang menandai keputusan approve/reject itu sendiri.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('topup_requests', function (Blueprint $table) {
            $table->foreignId('bank_verified_by')->nullable()->after('payment_reference')->constrained('users')->nullOnDelete();
            $table->timestamp('bank_verified_at')->nullable()->after('bank_verified_by');
        });
    }

    public function down(): void
    {
        Schema::table('topup_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('bank_verified_by');
            $table->dropColumn('bank_verified_at');
        });
    }
};
