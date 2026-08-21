<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $statements = [
            "CREATE INDEX IF NOT EXISTS idx_products_lower_name ON products (lower(name));",
            "CREATE INDEX IF NOT EXISTS idx_products_lower_sku ON products (lower(sku));",
            "CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items (product_id);",
            "CREATE INDEX IF NOT EXISTS idx_sales_member_id ON sales (member_id);",
            "CREATE INDEX IF NOT EXISTS idx_product_images_product_id_primary ON product_images (product_id, is_primary);",
            "CREATE INDEX IF NOT EXISTS idx_point_transactions_member_created ON point_transactions (member_id, created_at);",
        ];

        foreach ($statements as $sql) {
            DB::statement($sql);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $indexes = [
            'idx_products_lower_name',
            'idx_products_lower_sku',
            'idx_sale_items_product_id',
            'idx_sales_member_id',
            'idx_product_images_product_id_primary',
            'idx_point_transactions_member_created',
        ];

        foreach ($indexes as $idx) {
            DB::statement("DROP INDEX IF EXISTS {$idx};");
        }
    }
};
