<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasIndex('products', 'products_category_id_is_active_index')) {
                $table->index(['category_id', 'is_active']);
            }
            if (! Schema::hasIndex('products', 'products_brand_id_is_active_index')) {
                $table->index(['brand_id', 'is_active']);
            }
            if (! Schema::hasIndex('products', 'products_is_favorite_is_active_index')) {
                $table->index(['is_favorite', 'is_active']);
            }
        });

        Schema::table('members', function (Blueprint $table) {
            if (! Schema::hasIndex('members', 'members_status_balance_cache_index')) {
                $table->index(['status', 'balance_cache']);
            }
        });

        Schema::table('topup_requests', function (Blueprint $table) {
            if (! Schema::hasIndex('topup_requests', 'topup_requests_status_created_at_index')) {
                $table->index(['status', 'created_at']);
            }
        });

        if (! Schema::hasIndex('cashier_sessions', 'cashier_sessions_user_id_status_index')) {
            Schema::table('cashier_sessions', function (Blueprint $table) {
                $table->index(['user_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['category_id', 'is_active']);
            $table->dropIndex(['brand_id', 'is_active']);
            $table->dropIndex(['is_favorite', 'is_active']);
        });

        Schema::table('members', function (Blueprint $table) {
            $table->dropIndex(['status', 'balance_cache']);
        });

        Schema::table('topup_requests', function (Blueprint $table) {
            $table->dropIndex(['status', 'created_at']);
        });
    }
};
