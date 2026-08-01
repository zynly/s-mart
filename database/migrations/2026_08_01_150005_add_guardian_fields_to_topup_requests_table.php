<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * T-095 (Fase 16). Dua kolom pertama sesuai ADR-0010/
 * CATATAN-PERBAIKAN.md §Fase16 — struktur disiapkan untuk payment
 * gateway (Midtrans/Xendit, Fase 19+), BUKAN diaktifkan sekarang;
 * `payment_provider` selalu 'manual' di MVP ini. `guardian_id`
 * ditambahkan di luar spec tertulis eksplisit — perlu untuk tahu wali
 * MANA yang mengajukan ketika satu anak punya lebih dari satu wali
 * (guardian_member many-to-many), tanpa ini riwayat top-up wali di
 * portal tidak bisa difilter per-wali.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('topup_requests', function (Blueprint $table) {
            $table->foreignId('guardian_id')->nullable()->after('member_id')->constrained()->nullOnDelete();
            $table->string('payment_provider')->nullable()->default('manual')->after('reject_reason');
            $table->string('payment_reference')->nullable()->after('payment_provider');
        });
    }

    public function down(): void
    {
        Schema::table('topup_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('guardian_id');
            $table->dropColumn(['payment_provider', 'payment_reference']);
        });
    }
};
