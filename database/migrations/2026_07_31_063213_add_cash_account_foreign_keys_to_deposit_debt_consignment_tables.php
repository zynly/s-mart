<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // cash_accounts baru dibuat di fase ini — kolom-kolom berikut sudah
        // ada sejak Fase 4/6 tanpa FK (tabel belum ada saat itu).
        Schema::table('deposit_transactions', function (Blueprint $table) {
            $table->foreign('cash_account_id')->references('id')->on('cash_accounts')->nullOnDelete();
            $table->foreign('cashier_session_id')->references('id')->on('cashier_sessions')->nullOnDelete();
        });

        Schema::table('debt_payments', function (Blueprint $table) {
            $table->foreign('cash_account_id')->references('id')->on('cash_accounts')->nullOnDelete();
        });

        Schema::table('consignment_settlements', function (Blueprint $table) {
            $table->foreign('cash_account_id')->references('id')->on('cash_accounts')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('deposit_transactions', function (Blueprint $table) {
            $table->dropForeign(['cash_account_id']);
            $table->dropForeign(['cashier_session_id']);
        });

        Schema::table('debt_payments', function (Blueprint $table) {
            $table->dropForeign(['cash_account_id']);
        });

        Schema::table('consignment_settlements', function (Blueprint $table) {
            $table->dropForeign(['cash_account_id']);
        });
    }
};
