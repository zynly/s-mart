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
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->unique()->after('name');
            $table->string('phone')->nullable()->after('email');
            $table->string('avatar')->nullable()->after('phone');
            $table->string('employee_code')->nullable()->after('avatar');
            $table->foreignId('outlet_id')->nullable()->after('employee_code');
            $table->string('pin')->nullable()->after('password');
            $table->boolean('is_active')->default(true)->after('pin');
            $table->timestamp('last_login_at')->nullable()->after('is_active');
            $table->string('last_login_ip', 45)->nullable()->after('last_login_at');
            $table->string('last_login_user_agent', 500)->nullable()->after('last_login_ip');
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'username',
                'phone',
                'avatar',
                'employee_code',
                'outlet_id',
                'pin',
                'is_active',
                'last_login_at',
                'last_login_ip',
                'last_login_user_agent',
            ]);
            $table->dropSoftDeletes();
        });
    }
};
