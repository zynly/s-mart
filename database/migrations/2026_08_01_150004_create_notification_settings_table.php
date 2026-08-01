<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guardian_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('low_balance_alert')->default(true);
            $table->unsignedInteger('low_balance_threshold')->default(20000);
            $table->boolean('weekly_summary')->default(true);
            $table->boolean('transaction_alert')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_settings');
    }
};
