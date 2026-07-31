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
        Schema::create('stock_layer_consumptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_layer_id')->constrained()->restrictOnDelete();
            $table->decimal('qty', 12, 3);
            $table->bigInteger('unit_cost');
            $table->bigInteger('total_cost');
            $table->nullableMorphs('consumableable', 'slc_consumableable_index');
            $table->boolean('is_returned')->default(false);
            $table->timestamps();

            $table->index('stock_layer_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_layer_consumptions');
    }
};
