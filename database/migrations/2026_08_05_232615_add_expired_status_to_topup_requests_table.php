<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Integrasi Midtrans — status `expired` khusus untuk Snap token yang
 * kedaluwarsa tanpa dibayar (state yang tidak mungkin terjadi di alur
 * transfer manual, makanya belum ada di enum asli).
 * Dikonversi ke PostgreSQL-compatible syntax (tidak pakai MySQL MODIFY ENUM).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE topup_requests DROP CONSTRAINT IF EXISTS topup_requests_status_check");
            DB::statement("ALTER TABLE topup_requests ADD CONSTRAINT topup_requests_status_check CHECK (status IN ('pending','approved','rejected','expired'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("UPDATE topup_requests SET status = 'rejected' WHERE status = 'expired'");
            DB::statement("ALTER TABLE topup_requests DROP CONSTRAINT IF EXISTS topup_requests_status_check");
            DB::statement("ALTER TABLE topup_requests ADD CONSTRAINT topup_requests_status_check CHECK (status IN ('pending','approved','rejected'))");
        }
    }
};
