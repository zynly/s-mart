<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * T-076 (Fase 12). Kolom ini didokumentasikan di Fase 5 dengan
     * catatan eksplisit "Evaluasi dihapus di Fase 12 bila tidak pernah
     * terpakai" — dicek: tidak ada satu pun service (Purchase, Transfer,
     * dst) yang pernah membacanya. Transfer di Fase 12 tidak butuh pool
     * qty terpisah: saat kirim, layer asal langsung dikonsumsi (FEFO),
     * jadi stocks.qty outlet asal sudah akurat mencerminkan "barang
     * sedang di jalan" tanpa perlu reserved_qty.
     */
    public function up(): void
    {
        Schema::table('stocks', function (Blueprint $table) {
            $table->dropColumn('reserved_qty');
        });
    }

    public function down(): void
    {
        Schema::table('stocks', function (Blueprint $table) {
            $table->decimal('reserved_qty', 12, 3)->default(0)->after('qty');
        });
    }
};
