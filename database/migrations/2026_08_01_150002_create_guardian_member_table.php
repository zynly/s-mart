<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guardian_member', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guardian_id')->constrained()->cascadeOnDelete();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->unique(['guardian_id', 'member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guardian_member');
    }
};
