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
        Schema::create('cashier_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->foreignId('outlet_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('cash_account_id')->constrained()->restrictOnDelete();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->bigInteger('opening_cash');
            $table->bigInteger('expected_cash')->default(0);
            $table->bigInteger('actual_cash')->nullable();
            $table->bigInteger('difference')->nullable();
            $table->bigInteger('total_sales_cash')->default(0);
            $table->bigInteger('total_sales_deposit')->default(0);
            $table->bigInteger('total_sales_noncash')->default(0);
            $table->bigInteger('total_topup_cash')->default(0);
            $table->bigInteger('total_receivable_cash')->default(0)
                ->comment('Hanya pelunasan piutang tunai — transfer masuk total_receivable_noncash.');
            $table->bigInteger('total_receivable_noncash')->default(0);
            $table->bigInteger('total_cash_in')->default(0);
            $table->bigInteger('total_cash_out')->default(0);
            $table->bigInteger('total_drop')->default(0);
            $table->bigInteger('total_refund_cash')->default(0);
            $table->unsignedInteger('transaction_count')->default(0);
            $table->unsignedInteger('void_count')->default(0);
            $table->enum('status', ['open', 'closed', 'force_closed'])->default('open');
            $table->string('difference_reason')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->string('note')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['outlet_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cashier_sessions');
    }
};
