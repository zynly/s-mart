<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * qty disimpan signed (mengikuti convention stock_movements.qty)
     * meski payload dari form selalu positif — StockAdjustmentService
     * yang menentukan tandanya dari header type saat menyimpan baris ini.
     */
    public function up(): void
    {
        Schema::create('stock_adjustment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_adjustment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('qty', 12, 3)->comment('Signed: + increase, - decrease.');
            $table->bigInteger('unit_cost')->default(0);
            $table->bigInteger('total_cost')->default(0);
            $table->foreignId('stock_layer_id')->nullable()->constrained('stock_layers')->nullOnDelete();
            $table->string('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_adjustment_items');
    }
};
