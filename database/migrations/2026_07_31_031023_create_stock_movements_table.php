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
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('outlet_id')->constrained()->restrictOnDelete();
            $table->enum('type', [
                'purchase', 'sale', 'sale_return', 'purchase_return', 'transfer_in',
                'transfer_out', 'adjustment', 'opname', 'write_off', 'expired',
                'consignment_in', 'consignment_return',
            ]);
            $table->decimal('qty', 12, 3)->comment('Signed: + masuk, - keluar');
            $table->decimal('qty_before', 12, 3);
            $table->decimal('qty_after', 12, 3);
            $table->bigInteger('unit_cost')->nullable();
            $table->bigInteger('total_cost')->nullable();
            $table->foreignId('stock_layer_id')->nullable()->constrained()->nullOnDelete();
            $table->nullableMorphs('sourceable');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('note')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['product_id', 'outlet_id', 'created_at']);
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
