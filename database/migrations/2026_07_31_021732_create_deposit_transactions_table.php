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
        Schema::create('deposit_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->foreignId('member_id')->constrained()->restrictOnDelete();
            $table->foreignId('member_card_id')->nullable()->constrained('member_cards')->nullOnDelete();
            $table->foreignId('outlet_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('type', [
                'topup', 'purchase', 'refund', 'withdrawal', 'adjustment',
                'bonus', 'card_transfer_in', 'card_transfer_out', 'expired', 'closing',
            ]);
            $table->bigInteger('amount')->comment('Signed: + masuk, - keluar');
            $table->bigInteger('balance_before');
            $table->bigInteger('balance_after');
            $table->nullableMorphs('sourceable');
            $table->foreignId('payment_method_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('cash_account_id')->nullable()
                ->comment('FK ke cash_accounts, tabel baru dibuat Fase 7 — belum ada constraint.');
            $table->unsignedBigInteger('cashier_session_id')->nullable()
                ->comment('FK ke cashier_sessions, tabel baru dibuat Fase 7 — belum ada constraint.');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete()
                ->comment('NULL untuk transaksi otomatis sistem (bonus ulang tahun, rekonsiliasi).');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('idempotency_key', 100)->unique();
            $table->string('note')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['member_id', 'created_at']);
            $table->index(['outlet_id', 'created_at']);
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deposit_transactions');
    }
};
