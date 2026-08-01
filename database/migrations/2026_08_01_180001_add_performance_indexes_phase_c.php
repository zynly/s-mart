<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Temuan audit performa (Phase C, MEDIUM). Tiga index yang hilang di
 * tabel paling cepat tumbuh:
 * - `sales`: dashboard & semua Report `app/Reports/*.php` filter
 *   `status='completed'` + rentang tanggal TANPA `outlet_id` — index
 *   `['outlet_id','sale_date']` yang ada tidak kepakai untuk pola ini.
 *   Index `status` sendiri (kardinalitas 4 nilai) diganti komposit
 *   `['status','sale_date']` yang jauh lebih selektif — bukan ditambah
 *   di sampingnya (index tunggal `status` jadi mubazir, hanya nambah
 *   biaya tulis).
 * - `activity_log`: `ActivityLogController::index()` `-latest()` +
 *   filter tanggal, tanpa index `created_at` — full scan begitu tembus
 *   puluhan ribu baris (tabel audit yang tumbuh tiap transaksi).
 * - `sale_items.promo_id`: dipakai `PromoEngine::checkQuota()` &
 *   laporan "penjualan per produk" — sudah punya FK ke `promos`
 *   (`sale_items_promo_id_foreign`, ditambahkan setelah Fase 10) tapi
 *   TIDAK punya index eksplisit untuk query WHERE/JOIN biasa (FK
 *   di MySQL/InnoDB butuh index pendukung, tapi itu tidak otomatis
 *   berarti query planner memilihnya untuk pola akses lain).
 *
 * Catatan `down()`: index `sale_items.promo_id` SENGAJA tidak di-drop
 * saat rollback — MySQL menolaknya ("needed in a foreign key
 * constraint") karena FK di atas butuh index pendukung. Membiarkannya
 * saat rollback tidak berbahaya (index murni menguntungkan, bukan
 * constraint baru).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->index(['status', 'sale_date']);
        });

        Schema::table('activity_log', function (Blueprint $table) {
            $table->index('created_at');
        });

        // Idempoten dengan sengaja (beda dari 2 blok di atas) — index
        // ini TIDAK di-drop saat down() (lihat docblock class), jadi
        // up() harus aman dipanggil ulang setelah rollback+migrate.
        if (! Schema::hasIndex('sale_items', 'sale_items_promo_id_index')) {
            Schema::table('sale_items', function (Blueprint $table) {
                $table->index('promo_id');
            });
        }
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropIndex(['status', 'sale_date']);
            $table->index('status');
        });

        Schema::table('activity_log', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });

        // sale_items.promo_id index SENGAJA tidak di-drop di sini —
        // lihat catatan class-level docblock.
    }
};
