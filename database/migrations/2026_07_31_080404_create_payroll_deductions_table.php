<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_deductions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->restrictOnDelete();
            $table->foreignId('sale_id')->constrained()->restrictOnDelete();
            $table->string('period', 7)->comment('Format YYYY-MM.');
            $table->bigInteger('amount');
            $table->enum('status', ['pending', 'deducted', 'cancelled'])->default('pending');
            $table->timestamp('deducted_at')->nullable();
            $table->timestamps();

            $table->index(['member_id', 'period']);
            $table->index(['period', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_deductions');
    }
};
