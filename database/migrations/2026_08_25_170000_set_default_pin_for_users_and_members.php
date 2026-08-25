<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Set default PIN 123456 for users and members who have null PIN.
     */
    public function up(): void
    {
        $defaultHashedPin = Hash::make('123456');

        DB::table('users')
            ->whereNull('pin')
            ->update(['pin' => $defaultHashedPin]);

        DB::table('members')
            ->whereNull('pin')
            ->update(['pin' => $defaultHashedPin]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op for safety of existing user PINs
    }
};
