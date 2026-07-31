<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_return_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_item_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('unit_id')->constrained()->restrictOnDelete();
            $table->decimal('qty', 12, 3);
            $table->decimal('qty_base', 12, 3);
            $table->bigInteger('unit_price');
            $table->bigInteger('subtotal');
            $table->bigInteger('unit_cost');
            $table->bigInteger('total_cost');
            // Nullable: satu sale_item bisa dipecah ke banyak stock_layer_
            // consumption oleh FEFO — baris ini diisi hanya bila baris retur
            // persis berasal dari SATU consumption. Rincian per-layer penuh
            // selalu ada di stock_layer_consumptions.qty_returned +
            // stock_movements, bukan di sini.
            $table->foreignId('stock_layer_consumption_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('condition', ['good', 'damaged'])->default('good');
            $table->boolean('restock')->default(true);
            // FK ke stock_write_offs ditambahkan di migration write-offs
            // (tabel itu dibuat belakangan, sama pola dengan promo_id di
            // sale_items Fase 8 -> Fase 10).
            $table->unsignedBigInteger('stock_write_off_id')->nullable();
            $table->timestamps();

            $table->index('sale_item_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_return_items');
    }
};
