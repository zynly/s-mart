<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_layer_consumptions', function (Blueprint $table) {
            $table->decimal('qty_returned', 12, 3)->default(0)->after('qty');
        });

        // Retur penuh lama (void) sudah menandai is_returned=true tanpa
        // qty_returned — samakan supaya guard baru di StockService::
        // returnToLayer() tidak menganggap baris lama masih punya sisa.
        DB::table('stock_layer_consumptions')
            ->where('is_returned', true)
            ->update(['qty_returned' => DB::raw('qty')]);
    }

    public function down(): void
    {
        Schema::table('stock_layer_consumptions', function (Blueprint $table) {
            $table->dropColumn('qty_returned');
        });
    }
};
