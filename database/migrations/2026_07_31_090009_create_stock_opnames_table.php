<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * scope: 'location' sengaja tidak ada di enum — tidak ada kolom
     * lokasi/rak di skema produk manapun sepanjang Fase 0-11.
     */
    public function up(): void
    {
        Schema::create('stock_opnames', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->foreignId('outlet_id')->constrained()->restrictOnDelete();
            $table->enum('scope', ['all', 'category', 'brand', 'product']);
            $table->json('scope_ids')->nullable();
            $table->date('opname_date');
            $table->timestamp('cutoff_at')->nullable();
            $table->enum('status', ['counting', 'review', 'approved', 'posted', 'cancelled'])->default('counting');
            $table->unsignedInteger('total_items')->default(0);
            $table->unsignedInteger('counted_items')->default(0);
            $table->decimal('total_variance_qty', 14, 3)->default(0);
            $table->bigInteger('total_variance_value')->default(0);
            $table->decimal('variance_percent', 8, 4)->default(0);
            $table->boolean('is_blind')->default(true);
            $table->foreignId('started_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->string('note')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['outlet_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_opnames');
    }
};
