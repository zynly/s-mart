<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * REVISI-R1-v2.md §1.3 — fondasi multi-outlet "versi ringan". Relasi
 * user-outlet berubah dari satu-ke-satu (`users.outlet_id`) menjadi
 * banyak-ke-banyak, tanpa menghapus kolom lama (kompatibilitas + jadi
 * sumber fallback bila baris pivot belum ada — lihat User::outletIds()).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('outlet_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('outlet_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->unique(['user_id', 'outlet_id']);
        });

        // Backfill dari kolom lama users.outlet_id supaya data existing
        // langsung konsisten dengan model banyak-ke-banyak yang baru,
        // tanpa menunggu seeder terpisah dijalankan manual.
        $now = now();
        $rows = DB::table('users')->whereNotNull('outlet_id')->get(['id', 'outlet_id']);
        foreach ($rows as $row) {
            DB::table('outlet_user')->insertOrIgnore([
                'user_id' => $row->id,
                'outlet_id' => $row->outlet_id,
                'is_primary' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('outlet_user');
    }
};
