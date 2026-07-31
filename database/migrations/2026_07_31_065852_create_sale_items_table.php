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
        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('unit_id')->constrained()->restrictOnDelete();
            $table->decimal('qty', 12, 3);
            $table->decimal('qty_base', 12, 3);
            $table->bigInteger('original_price');
            $table->bigInteger('unit_price');
            $table->bigInteger('discount_amount')->default(0);
            $table->decimal('discount_percent', 5, 2)->default(0);
            $table->unsignedBigInteger('promo_id')->nullable()->comment('FK ke promos, tabel baru dibuat Fase 10 — belum ada constraint.');
            $table->bigInteger('promo_discount')->default(0);
            $table->bigInteger('subtotal');
            $table->bigInteger('unit_cost')->default(0);
            $table->bigInteger('total_cost')->default(0)->comment('Dari StockService::consume() FEFO');
            $table->boolean('is_free')->default(false);
            $table->foreignId('price_changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('note')->nullable();
            $table->timestamps();

            $table->index('sale_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sale_items');
    }
};
