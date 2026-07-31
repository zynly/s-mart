<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_return_refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_return_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_payment_id')->constrained()->restrictOnDelete();
            $table->foreignId('payment_method_id')->constrained()->restrictOnDelete();
            $table->enum('target', ['same', 'deposit', 'transfer', 'forfeited']);
            $table->bigInteger('amount');
            $table->integer('point_refunded')->nullable();
            $table->foreignId('deposit_transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('cash_account_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reference_no')->nullable();
            $table->enum('status', ['pending', 'settled', 'forfeited', 'failed'])->default('settled');
            $table->timestamp('settled_at')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('sale_payment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_return_refunds');
    }
};
