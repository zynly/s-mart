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
        Schema::create('sale_holds', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->foreignId('outlet_id')->constrained()->restrictOnDelete();
            $table->foreignId('cashier_session_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('member_id')->nullable()->constrained()->nullOnDelete();
            $table->json('cart_data');
            $table->unsignedInteger('item_count')->default(0);
            $table->bigInteger('total')->default(0);
            $table->timestamp('held_at');
            $table->string('note')->nullable();
            $table->timestamps();

            $table->index(['cashier_session_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sale_holds');
    }
};
