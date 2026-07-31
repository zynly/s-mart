<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_write_offs', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->foreignId('outlet_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('stock_layer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('sale_return_item_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('qty', 12, 3);
            $table->bigInteger('unit_cost');
            $table->bigInteger('total_cost');
            $table->enum('type', ['damaged', 'lost', 'expired', 'shrinkage']);
            $table->string('reason');
            $table->string('attachment')->nullable();
            $table->enum('status', ['draft', 'approved', 'completed', 'rejected'])->default('draft');
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['outlet_id', 'status']);
            $table->index('product_id');
        });

        Schema::table('sale_return_items', function (Blueprint $table) {
            $table->foreign('stock_write_off_id')->references('id')->on('stock_write_offs')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sale_return_items', function (Blueprint $table) {
            $table->dropForeign(['stock_write_off_id']);
        });

        Schema::dropIfExists('stock_write_offs');
    }
};
