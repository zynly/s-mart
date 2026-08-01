<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journals', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->foreignId('outlet_id')->nullable()->constrained()->nullOnDelete();
            $table->date('journal_date');
            $table->enum('type', ['general', 'sales', 'purchase', 'cash', 'adjustment', 'closing', 'reversing']);
            $table->string('description')->nullable();
            $table->nullableMorphs('sourceable');
            $table->bigInteger('total_debit')->default(0);
            $table->bigInteger('total_credit')->default(0);
            $table->boolean('is_balanced')->default(true);
            $table->enum('status', ['draft', 'posted', 'reversed'])->default('posted');
            $table->foreignId('reversed_journal_id')->nullable()->constrained('journals')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();

            $table->index(['journal_date', 'status']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journals');
    }
};
