<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('outlet_id')->constrained()->restrictOnDelete();
            $table->decimal('qty', 12, 3)->default(0)->comment('Cache dari SUM(qty_remaining) stock_layers aktif — bukan sumber kebenaran, wajib direkonsiliasi via stock:recalculate-cache.');
            $table->decimal('reserved_qty', 12, 3)->default(0)
                ->comment('Qty yang dialokasikan untuk PO/Transfer in-transit. TIDAK dipakai untuk hold kasir (hold tidak mengurangi stok). Evaluasi dihapus di Fase 12 bila tidak pernah terpakai.');
            $table->bigInteger('avg_cost')->default(0);
            $table->bigInteger('last_cost')->default(0);
            $table->timestamp('last_movement_at')->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'outlet_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stocks');
    }
};
