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
        Schema::create('debt_payments', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->foreignId('debt_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('cash_account_id')->nullable()
                ->comment('FK ke cash_accounts, tabel baru dibuat Fase 7 — belum ada constraint.');
            $table->date('payment_date');
            $table->bigInteger('amount');
            $table->foreignId('payment_method_id')->nullable()->constrained()->nullOnDelete();
            $table->string('ref_no', 50)->nullable();
            $table->string('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('debt_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('debt_payments');
    }
};
