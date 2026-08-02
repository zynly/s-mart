<?php

namespace App\Support;

/**
 * T-088 (Phase D). Aturan bucket umur piutang/hutang (current/0-30/
 * 31-60/61-90/90+) sebelumnya ditulis ulang identik di 4 tempat PHP
 * (2 `match(true)` di DebtService/ReceivableService::getAging(), 2
 * SQL `CASE WHEN` string di DebtAgingReport/ReceivableAgingReport) —
 * satu sumber kebenaran di sini. Ambang batasnya PERSIS sama untuk
 * hutang & piutang (tidak ada alasan bisnis keduanya beda), jadi
 * aman digabung satu class untuk keduanya.
 *
 * Sisi frontend (`Lib/aging.ts`) punya salinan label bucket sendiri
 * (bahasa beda, tidak bisa impor lintas PHP<->TS) — kalau ambang hari
 * di sini berubah, sinkronkan manual ke sana juga.
 */
final class AgingBucket
{
    public static function forDaysOverdue(int $daysOverdue): string
    {
        return match (true) {
            $daysOverdue <= 0 => 'current',
            $daysOverdue <= 30 => '0-30',
            $daysOverdue <= 60 => '31-60',
            $daysOverdue <= 90 => '61-90',
            default => '90+',
        };
    }

    public static function sqlCase(string $dueDateColumn): string
    {
        return "CASE
            WHEN DATEDIFF(CURDATE(), {$dueDateColumn}) <= 0 THEN 'current'
            WHEN DATEDIFF(CURDATE(), {$dueDateColumn}) <= 30 THEN '0-30'
            WHEN DATEDIFF(CURDATE(), {$dueDateColumn}) <= 60 THEN '31-60'
            WHEN DATEDIFF(CURDATE(), {$dueDateColumn}) <= 90 THEN '61-90'
            ELSE '90+' END";
    }
}
