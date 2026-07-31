<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->foreignId('from_outlet_id')->constrained('outlets')->restrictOnDelete();
            $table->foreignId('to_outlet_id')->constrained('outlets')->restrictOnDelete();
            $table->date('transfer_date');
            $table->date('expected_arrival')->nullable();
            $table->enum('status', ['draft', 'approved', 'in_transit', 'received', 'partial', 'cancelled'])->default('draft');
            $table->decimal('total_qty', 14, 3)->default(0);
            $table->bigInteger('total_value')->default(0);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->string('note')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['from_outlet_id', 'status']);
            $table->index(['to_outlet_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transfers');
    }
};
