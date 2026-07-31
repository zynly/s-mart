<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_method_id')->constrained()->restrictOnDelete();
            $table->bigInteger('amount');
            $table->bigInteger('received_amount')->nullable();
            $table->bigInteger('change_amount')->default(0);
            $table->foreignId('cash_account_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reference_no')->nullable()
                ->comment('No. approval EDC / referensi QRIS-transfer — wajib bila payment_methods.requires_reference.');
            $table->decimal('mdr_percent', 5, 2)->default(0);
            $table->bigInteger('mdr_amount')->default(0);
            $table->bigInteger('net_amount');
            $table->foreignId('deposit_transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('coupon_id')->nullable()
                ->comment('FK ke coupons (Fase 10, T-061) — kolom disiapkan sekarang, divalidasi nyata setelah tabel coupons ada.');
            $table->integer('point_used')->nullable();
            $table->enum('status', ['pending', 'settled', 'failed', 'refunded'])->default('settled');
            $table->timestamp('settled_at')->nullable();
            $table->timestamps();

            $table->index(['payment_method_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_payments');
    }
};
