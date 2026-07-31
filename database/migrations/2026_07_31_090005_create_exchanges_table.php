<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exchanges', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->foreignId('sale_return_id')->constrained()->restrictOnDelete();
            $table->foreignId('new_sale_id')->constrained('sales')->restrictOnDelete();
            $table->foreignId('outlet_id')->constrained()->restrictOnDelete();
            $table->bigInteger('price_difference')->comment('Signed: + pembeli menambah bayar, - dikembalikan');
            $table->enum('settlement', ['cash_in', 'cash_out', 'deposit', 'none'])->default('none');
            $table->string('idempotency_key', 100)->unique();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exchanges');
    }
};
