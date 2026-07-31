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
        Schema::create('purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('unit_id')->constrained()->restrictOnDelete();
            $table->decimal('qty', 12, 3);
            $table->decimal('qty_base', 12, 3)->comment('Qty setelah konversi ke satuan dasar produk');
            $table->bigInteger('unit_price');
            $table->bigInteger('discount')->default(0);
            $table->bigInteger('subtotal');
            $table->bigInteger('allocated_cost')->default(0)->comment('Porsi other_cost yang dialokasikan, masuk HPP');
            $table->bigInteger('final_unit_cost')->comment('(subtotal + allocated_cost) / qty_base');
            $table->string('batch_no', 50)->nullable();
            $table->date('expired_at')->nullable();
            $table->foreignId('stock_layer_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_items');
    }
};
