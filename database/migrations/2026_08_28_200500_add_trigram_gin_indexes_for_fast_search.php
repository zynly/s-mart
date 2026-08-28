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
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            // 1. Enable pg_trgm extension for blazing fast ILIKE '%...%' substring searches
            DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

            $statements = [
                // Members Name Search Indexes
                "CREATE INDEX IF NOT EXISTS idx_members_name_trgm ON members USING gin (name gin_trgm_ops);",
                "CREATE INDEX IF NOT EXISTS idx_members_lower_name ON members (lower(name));",
                "CREATE INDEX IF NOT EXISTS idx_members_nis_btree ON members (nis);",
                "CREATE INDEX IF NOT EXISTS idx_members_member_number_btree ON members (member_number);",
                "CREATE INDEX IF NOT EXISTS idx_members_status_type ON members (status, type);",

                // Products Search Indexes
                "CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);",
                "CREATE INDEX IF NOT EXISTS idx_products_sku_trgm ON products USING gin (sku gin_trgm_ops);",

                // Guardians Search Indexes
                "CREATE INDEX IF NOT EXISTS idx_guardians_name_trgm ON guardians USING gin (name gin_trgm_ops);",
                "CREATE INDEX IF NOT EXISTS idx_guardians_phone_btree ON guardians (phone);",
            ];

            foreach ($statements as $sql) {
                try {
                    DB::statement($sql);
                } catch (\Throwable) {
                    // Ignore if already exists or partial
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            $indexes = [
                'idx_members_name_trgm',
                'idx_members_lower_name',
                'idx_members_nis_btree',
                'idx_members_member_number_btree',
                'idx_members_status_type',
                'idx_products_name_trgm',
                'idx_products_sku_trgm',
                'idx_guardians_name_trgm',
                'idx_guardians_phone_btree',
            ];

            foreach ($indexes as $idx) {
                DB::statement("DROP INDEX IF EXISTS {$idx};");
            }
        }
    }
};
