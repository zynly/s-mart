<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * REVISI-R1-v2.md §6.3 Jalur B — "Simpan hash gambar bukti → tolak
 * bila bukti identik pernah dipakai" (mencegah satu foto bukti
 * transfer diajukan berulang, sengaja maupun tidak sengaja, ke
 * beberapa pengajuan top-up berbeda).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('topup_requests', function (Blueprint $table) {
            $table->string('proof_hash', 64)->nullable()->after('proof_image')->index();
        });
    }

    public function down(): void
    {
        Schema::table('topup_requests', function (Blueprint $table) {
            $table->dropColumn('proof_hash');
        });
    }
};
