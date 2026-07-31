<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->enum('type', [
                'cash', 'card', 'qris', 'ewallet', 'transfer',
                'deposit', 'voucher', 'point', 'credit', 'payroll',
            ]);
            // Referensi ke cash_accounts (Fase 7, T-043) — tabel belum ada,
            // FK constraint ditambahkan saat migration itu dibuat.
            $table->unsignedBigInteger('cash_account_id')->nullable();
            $table->decimal('mdr_percent', 5, 2)->default(0);
            $table->boolean('requires_reference')->default(false);
            $table->boolean('allows_change')->default(false);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
