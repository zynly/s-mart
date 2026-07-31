<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * 1 baris per produk (menjaga uang/qty tidak pecah), TAPI FEFO saat
     * kirim bisa menyentuh beberapa stock_layer sekaligus bila batch
     * berbeda unit_cost/expired_at — rincian per-layer penuh tersimpan
     * di stock_layer_consumptions (consumableable_type = StockTransferItem)
     * dan StockLayer.sourceable (destination layer baru per consumption).
     * source_layer_id/destination_layer_id di sini hanya menunjuk
     * layer pertama untuk kasus umum 1-layer, BUKAN satu-satunya
     * catatan kebenaran.
     */
    public function up(): void
    {
        Schema::create('stock_transfer_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_transfer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('qty_sent', 12, 3);
            $table->decimal('qty_received', 12, 3)->nullable();
            $table->bigInteger('unit_cost')->default(0);
            $table->foreignId('source_layer_id')->nullable()->constrained('stock_layers')->nullOnDelete();
            $table->foreignId('destination_layer_id')->nullable()->constrained('stock_layers')->nullOnDelete();
            $table->string('batch_no')->nullable();
            $table->date('expired_at')->nullable();
            $table->string('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transfer_items');
    }
};
