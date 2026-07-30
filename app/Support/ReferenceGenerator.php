<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class ReferenceGenerator
{
    public static function generate(string $prefix, int $outletId): string
    {
        $date = now()->format('Ymd');

        $lastNumber = DB::transaction(function () use ($prefix, $outletId, $date) {
            $counter = DB::table('reference_counters')
                ->where('prefix', $prefix)
                ->where('outlet_id', $outletId)
                ->where('date', $date)
                ->lockForUpdate()
                ->first();

            if ($counter === null) {
                DB::table('reference_counters')->insert([
                    'prefix' => $prefix,
                    'outlet_id' => $outletId,
                    'date' => $date,
                    'last_number' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                return 1;
            }

            $next = $counter->last_number + 1;

            DB::table('reference_counters')
                ->where('prefix', $prefix)
                ->where('outlet_id', $outletId)
                ->where('date', $date)
                ->update([
                    'last_number' => $next,
                    'updated_at' => now(),
                ]);

            return $next;
        });

        return sprintf('%s-%s-%04d', $prefix, $date, $lastNumber);
    }
}
