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
        Schema::create('member_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->string('card_number', 30)->unique();
            $table->enum('type', ['barcode', 'rfid', 'virtual'])->default('barcode');
            $table->enum('status', ['active', 'lost', 'damaged', 'blocked', 'replaced'])->default('active');
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('blocked_at')->nullable();
            $table->string('block_reason')->nullable();
            $table->unsignedInteger('print_count')->default(0);
            $table->timestamp('last_used_at')->nullable();
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['member_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('member_cards');
    }
};
