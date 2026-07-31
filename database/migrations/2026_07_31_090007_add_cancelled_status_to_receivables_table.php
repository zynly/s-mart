<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL tidak punya ALTER TYPE ADD VALUE seperti Postgres — ganti
        // definisi enum langsung. 'cancelled' dipakai khusus untuk piutang
        // yang batal karena nota induknya di-void (Fase 11), beda makna
        // dari 'paid' (memang lunas dibayar) atau 'written_off' (utang
        // macet >90 hari, ADR-0005) meski sama-sama "tidak ditagih lagi".
        DB::statement("ALTER TABLE receivables MODIFY COLUMN status ENUM('unpaid', 'partial', 'paid', 'overdue', 'written_off', 'cancelled') NOT NULL DEFAULT 'unpaid'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE receivables MODIFY COLUMN status ENUM('unpaid', 'partial', 'paid', 'overdue', 'written_off') NOT NULL DEFAULT 'unpaid'");
    }
};
