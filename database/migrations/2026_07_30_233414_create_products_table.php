<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('name');
            $table->string('slug')->unique()->nullable();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('brand_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('base_unit_id')->constrained('units');
            $table->text('description')->nullable();
            $table->boolean('is_expirable')->default(false);
            $table->boolean('is_consignment')->default(false);
            $table->unsignedTinyInteger('consignment_percent')->nullable();
            $table->decimal('min_stock', 12, 3)->default(0);
            $table->decimal('max_stock', 12, 3)->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_favorite')->default(false);

            // Kolom storefront (ADR-0009, CATATAN-PERBAIKAN § Fase 2) —
            // digabung ke migration ini, bukan migration terpisah T-016.
            $table->boolean('is_visible_public')->default(false);
            $table->text('description_public')->nullable();
            $table->integer('public_order')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
