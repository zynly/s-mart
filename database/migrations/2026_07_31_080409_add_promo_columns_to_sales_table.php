<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('coupon_id')->nullable()->after('member_card_id')->constrained()->nullOnDelete();
            $table->integer('coupon_discount')->default(0)->after('promo_discount');
            $table->integer('points_earned')->default(0)->after('gross_profit');
            $table->integer('points_redeemed')->default(0)->after('points_earned');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('coupon_id');
            $table->dropColumn(['coupon_discount', 'points_earned', 'points_redeemed']);
        });
    }
};
