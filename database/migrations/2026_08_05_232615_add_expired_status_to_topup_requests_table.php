<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Integrasi Midtrans — status `expired` khusus untuk Snap token yang
 * kedaluwarsa tanpa dibayar (state yang tidak mungkin terjadi di alur
 * transfer manual, makanya belum ada di enum asli).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE topup_requests MODIFY status ENUM('pending','approved','rejected','expired') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("UPDATE topup_requests SET status = 'rejected' WHERE status = 'expired'");
        DB::statement("ALTER TABLE topup_requests MODIFY status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'");
    }
};
