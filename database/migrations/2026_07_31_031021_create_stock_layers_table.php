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
        Schema::create('stock_layers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('outlet_id')->constrained()->restrictOnDelete();
            $table->decimal('qty_in', 12, 3);
            $table->decimal('qty_remaining', 12, 3);
            $table->bigInteger('unit_cost')->comment('HPP per satuan dasar');
            $table->string('batch_no', 50)->nullable();
            $table->date('expired_at')->nullable();
            $table->dateTime('received_at');
            $table->nullableMorphs('sourceable');
            $table->boolean('is_consignment')->default(false);
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['product_id', 'outlet_id', 'qty_remaining']);
            $table->index('expired_at');
            $table->index('received_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_layers');
    }
};
