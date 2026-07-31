<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->foreignId('promo_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name', 150);
            $table->enum('discount_type', ['percent', 'amount']);
            $table->integer('discount_value');
            $table->integer('max_discount')->nullable();
            $table->integer('min_purchase')->nullable();
            $table->dateTime('valid_from');
            $table->dateTime('valid_until');
            $table->integer('quota')->default(1);
            $table->integer('used_count')->default(0);
            $table->integer('per_member_limit')->default(1);
            $table->foreignId('member_id')->nullable()->constrained()->nullOnDelete();
            $table->json('excluded_product_ids')->nullable();
            $table->enum('status', ['active', 'used', 'expired', 'cancelled'])->default('active');
            $table->enum('source', ['manual', 'birthday', 'loyalty', 'campaign'])->default('manual');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('coupon_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('member_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('discount_amount');
            $table->dateTime('redeemed_at');
            $table->boolean('is_reverted')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupon_redemptions');
        Schema::dropIfExists('coupons');
    }
};
