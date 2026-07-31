<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promos', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->enum('type', [
                'product', 'category', 'member_level', 'bundle', 'buy_x_get_y',
                'tiered_qty', 'happy_hour', 'clearance', 'birthday',
            ]);
            $table->enum('scope', ['item', 'bill']);
            $table->enum('discount_type', ['percent', 'amount', 'fixed_price', 'free_item']);
            $table->integer('discount_value')->default(0);
            $table->integer('max_discount')->nullable();
            $table->integer('min_purchase')->nullable();
            $table->decimal('min_qty', 12, 3)->nullable();
            $table->decimal('buy_qty', 12, 3)->nullable();
            $table->decimal('get_qty', 12, 3)->nullable();
            $table->foreignId('get_product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->json('tiers')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->json('days_of_week')->nullable();
            $table->integer('quota_total')->nullable();
            $table->integer('quota_per_member')->nullable();
            $table->integer('used_count')->default(0);
            $table->integer('priority')->default(0);
            $table->boolean('is_stackable')->default(false);
            $table->json('outlet_ids')->nullable();
            // CATATAN-PERBAIKAN.md § Fase 10: promo is_public=true tampil di
            // halaman /promo publik (Fase 19 storefront).
            $table->boolean('is_public')->default(false);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('promo_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promo_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['promo_id', 'product_id']);
        });

        Schema::create('promo_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promo_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['promo_id', 'category_id']);
        });

        Schema::create('promo_member_levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promo_id')->constrained()->cascadeOnDelete();
            $table->foreignId('member_level_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['promo_id', 'member_level_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promo_member_levels');
        Schema::dropIfExists('promo_categories');
        Schema::dropIfExists('promo_products');
        Schema::dropIfExists('promos');
    }
};
