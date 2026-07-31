<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class ReferenceGenerator
{
    private const MEMBER_TYPE_PREFIXES = [
        'santri' => '',
        'fasilitator' => 'F',
        'staff' => 'S',
        'public' => 'U',
    ];

    private const MEMBER_COUNTER_KEYS = [
        'santri' => 'mbr-str',
        'fasilitator' => 'mbr-fas',
        'staff' => 'mbr-stf',
        'public' => 'mbr-pub',
    ];

    public static function generate(string $prefix, int $outletId): string
    {
        $date = now()->format('Ymd');
        $lastNumber = self::increment($prefix, $outletId, $date);

        return sprintf('%s-%s-%04d', $prefix, $date, $lastNumber);
    }

    /**
     * Nomor anggota otomatis, aman dari race condition, bisa
     * penomoran ulang per angkatan (entry_year).
     *
     * santri (tanpa prefiks huruf): tahun(4) + urut(5) → 202600001
     * fasilitator/staff/public: huruf + tahun(4) + urut(4) → F20260001
     */
    public static function generateMemberNumber(string $type, int $entryYear): string
    {
        $letter = self::MEMBER_TYPE_PREFIXES[$type] ?? 'U';
        $counterKey = self::MEMBER_COUNTER_KEYS[$type] ?? 'mbr-pub';
        $year = (string) $entryYear;

        $lastNumber = self::increment($counterKey, 0, $year);

        return $letter === ''
            ? sprintf('%d%05d', $entryYear, $lastNumber)
            : sprintf('%s%d%04d', $letter, $entryYear, $lastNumber);
    }

    private static function increment(string $prefix, int $outletId, string $dateKey): int
    {
        return DB::transaction(function () use ($prefix, $outletId, $dateKey) {
            $counter = DB::table('reference_counters')
                ->where('prefix', $prefix)
                ->where('outlet_id', $outletId)
                ->where('date', $dateKey)
                ->lockForUpdate()
                ->first();

            if ($counter === null) {
                DB::table('reference_counters')->insert([
                    'prefix' => $prefix,
                    'outlet_id' => $outletId,
                    'date' => $dateKey,
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
                ->where('date', $dateKey)
                ->update([
                    'last_number' => $next,
                    'updated_at' => now(),
                ]);

            return $next;
        });
    }
}
