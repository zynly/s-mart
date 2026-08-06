<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Integrasi Midtrans (top-up wali) — `payment_reference` yang sudah
 * ada (ADR-0010) dipakai untuk simpan transaction_id Midtrans setelah
 * lunas. `snap_token` disimpan terpisah karena sifatnya berbeda
 * (token sesi pembayaran, dibuat SEBELUM lunas, dipakai frontend
 * untuk buka ulang popup Snap kalau wali menutup popup tanpa bayar).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('topup_requests', function (Blueprint $table) {
            $table->string('snap_token')->nullable()->after('payment_reference');
        });
    }

    public function down(): void
    {
        Schema::table('topup_requests', function (Blueprint $table) {
            $table->dropColumn('snap_token');
        });
    }
};
