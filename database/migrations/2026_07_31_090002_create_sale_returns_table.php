<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_returns', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->foreignId('sale_id')->constrained()->restrictOnDelete();
            $table->foreignId('outlet_id')->constrained()->restrictOnDelete();
            $table->foreignId('cashier_session_id')->nullable()->constrained()->restrictOnDelete();
            // Snapshot ADR-0007: kenapa opsi tunai ada/tidak ada saat retur
            // diproses, tanpa perlu join ulang ke cashier_sessions nanti.
            $table->boolean('origin_session_closed')->default(false);
            $table->foreignId('member_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('return_date');
            $table->enum('type', ['full', 'partial', 'exchange'])->default('partial');
            $table->enum('reason', ['damaged', 'wrong_item', 'expired', 'customer_request', 'other']);
            $table->string('reason_detail')->nullable();
            $table->bigInteger('subtotal')->default(0);
            $table->bigInteger('discount')->default(0);
            $table->bigInteger('tax')->default(0);
            $table->bigInteger('total')->default(0);
            $table->bigInteger('total_cost')->default(0)->comment('HPP yang dibalik');
            $table->enum('status', ['draft', 'approved', 'completed', 'rejected'])->default('draft');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('idempotency_key', 100)->unique();
            $table->string('note')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['outlet_id', 'return_date']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_returns');
    }
};
