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
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->foreignId('outlet_id')->constrained()->restrictOnDelete();
            $table->foreignId('cashier_session_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('member_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('member_card_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('payment_method_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('sale_date');
            $table->enum('type', ['regular', 'credit'])->default('regular');
            $table->bigInteger('subtotal')->default(0);
            $table->bigInteger('item_discount')->default(0);
            $table->bigInteger('bill_discount')->default(0);
            $table->bigInteger('promo_discount')->default(0);
            $table->bigInteger('total_discount')->default(0);
            $table->bigInteger('tax')->default(0);
            $table->bigInteger('rounding')->default(0);
            $table->bigInteger('grand_total')->default(0);
            $table->bigInteger('total_cost')->default(0)->comment('Total HPP dari konsumsi FEFO');
            $table->bigInteger('gross_profit')->default(0);
            $table->bigInteger('paid_amount')->default(0);
            $table->bigInteger('change_amount')->default(0);
            $table->enum('status', ['draft', 'hold', 'completed', 'void'])->default('draft');
            $table->string('void_reason')->nullable();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('voided_at')->nullable();
            $table->foreignId('price_changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('discount_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('idempotency_key', 100)->unique();
            $table->string('note')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['outlet_id', 'sale_date']);
            $table->index(['cashier_session_id', 'status']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
