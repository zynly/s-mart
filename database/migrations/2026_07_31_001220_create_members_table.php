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
        Schema::create('members', function (Blueprint $table) {
            $table->id();
            $table->string('member_number', 20)->unique();
            $table->string('name');
            $table->string('nis', 30)->nullable()->unique();
            $table->foreignId('member_level_id')->nullable()->constrained('member_levels')->nullOnDelete();
            $table->enum('type', ['santri', 'fasilitator', 'staff', 'public'])->default('santri');
            $table->string('class_name', 30)->nullable();
            $table->string('major', 30)->nullable();
            $table->unsignedSmallInteger('entry_year')->nullable();
            $table->enum('gender', ['L', 'P'])->nullable();
            $table->date('birth_date')->nullable();
            $table->string('phone', 20)->nullable();
            $table->text('address')->nullable();
            $table->string('photo')->nullable();
            $table->string('guardian_name')->nullable();
            $table->string('guardian_phone', 20)->nullable();
            $table->string('guardian_relation', 30)->nullable();
            $table->string('pin')->nullable();
            $table->unsignedTinyInteger('pin_attempts')->default(0);
            $table->timestamp('pin_locked_until')->nullable();
            $table->bigInteger('balance_cache')->default(0);
            $table->integer('point_balance')->default(0);
            $table->bigInteger('receivable_limit')->default(0);
            $table->bigInteger('daily_limit')->nullable();
            $table->bigInteger('weekly_limit')->nullable();
            $table->json('allowed_hours')->nullable();
            $table->json('allowed_days')->nullable();
            $table->json('blocked_categories')->nullable();
            $table->enum('status', ['active', 'inactive', 'graduated', 'transferred', 'suspended'])->default('active');
            $table->timestamp('suspended_until')->nullable();
            $table->string('suspend_reason')->nullable();
            $table->date('joined_at')->nullable();
            $table->date('graduated_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'status']);
            $table->index('class_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('members');
    }
};
