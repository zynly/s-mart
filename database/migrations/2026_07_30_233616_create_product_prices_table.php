<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Immutable (CATATAN-PERBAIKAN.md § Fase 2): TIDAK ada updated_at.
        // Ganti harga = tutup baris lama (isi effective_to) + insert baris
        // baru. Jangan tambahkan kolom update di service manapun.
        Schema::create('product_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('outlet_id')->constrained();
            $table->foreignId('unit_id')->constrained('units');
            $table->bigInteger('price');
            $table->bigInteger('member_price')->nullable();
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['product_id', 'outlet_id', 'unit_id', 'effective_from']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_prices');
    }
};
