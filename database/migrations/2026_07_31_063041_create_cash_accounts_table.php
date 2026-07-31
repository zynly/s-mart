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
        Schema::create('cash_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name');
            $table->enum('type', ['cash', 'bank', 'ewallet'])->default('cash');
            $table->foreignId('outlet_id')->constrained()->restrictOnDelete();
            $table->string('bank_name')->nullable();
            $table->string('account_number', 50)->nullable();
            $table->string('account_holder')->nullable();
            $table->bigInteger('opening_balance')->default(0);
            $table->bigInteger('current_balance')->default(0);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_drawer')->default(false)->comment('Laci kasir fisik — dipakai buka/tutup sesi.');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_accounts');
    }
};
