<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('point_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('type', ['earn', 'redeem', 'expired', 'adjustment', 'bonus']);
            $table->integer('points');
            $table->integer('balance_before');
            $table->integer('balance_after');
            $table->date('expired_at')->nullable();
            $table->string('note', 255)->nullable();
            // Append-only ledger seperti deposit_transactions (ADR-002) —
            // member.point_balance hanyalah cache.
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('point_transactions');
    }
};
