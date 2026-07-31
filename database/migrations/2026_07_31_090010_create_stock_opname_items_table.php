<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_opname_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_opname_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('system_qty', 12, 3)->comment('Dibekukan saat opname dimulai — blind count, tidak diperlihatkan ke petugas.');
            $table->decimal('physical_qty', 12, 3)->nullable();
            $table->decimal('variance_qty', 12, 3)->default(0);
            $table->bigInteger('unit_cost')->default(0);
            $table->bigInteger('variance_value')->default(0);
            $table->string('variance_reason')->nullable();
            $table->foreignId('counted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('counted_at')->nullable();
            $table->timestamps();

            $table->unique(['stock_opname_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_opname_items');
    }
};
