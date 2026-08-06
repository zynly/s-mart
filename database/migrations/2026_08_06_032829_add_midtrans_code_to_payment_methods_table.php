<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tambah kolom `midtrans_code` untuk mapping channel Midtrans ke metode pembayaran
     * dan `midtrans_active` untuk menandai apakah channel ini aktif digunakan di kasir POS.
     */
    public function up(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            // Kode channel Midtrans, mis: 'qris', 'gopay', 'bca_va', 'credit_card'
            // null berarti metode ini tidak melalui Midtrans (mis. CASH, DEPOSIT)
            $table->string('midtrans_code')->nullable()->after('type');
            // Apakah channel Midtrans ini aktif untuk ditampilkan di kasir POS?
            $table->boolean('midtrans_active')->default(false)->after('midtrans_code');
        });
    }

    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropColumn(['midtrans_code', 'midtrans_active']);
        });
    }
};
