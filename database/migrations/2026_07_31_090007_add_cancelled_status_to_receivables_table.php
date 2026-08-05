<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE receivables MODIFY COLUMN status ENUM('unpaid', 'partial', 'paid', 'overdue', 'written_off', 'cancelled') NOT NULL DEFAULT 'unpaid'");
        } elseif (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE receivables DROP CONSTRAINT IF EXISTS receivables_status_check");
            DB::statement("ALTER TABLE receivables ADD CONSTRAINT receivables_status_check CHECK (status::text IN ('unpaid', 'partial', 'paid', 'overdue', 'written_off', 'cancelled'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE receivables MODIFY COLUMN status ENUM('unpaid', 'partial', 'paid', 'overdue', 'written_off') NOT NULL DEFAULT 'unpaid'");
        } elseif (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE receivables DROP CONSTRAINT IF EXISTS receivables_status_check");
            DB::statement("ALTER TABLE receivables ADD CONSTRAINT receivables_status_check CHECK (status::text IN ('unpaid', 'partial', 'paid', 'overdue', 'written_off'))");
        }
    }
};
