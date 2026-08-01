<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('deposit:reconcile')->dailyAt('23:00');
Schedule::command('member:birthday-bonus')->dailyAt('06:00');
Schedule::command('stock:check-expiry')->dailyAt('05:00');
Schedule::command('session:auto-close')->dailyAt(config('pos.session_auto_close_time', '23:59'));
Schedule::command('point:expire')->dailyAt('05:30');
// T-094 (Fase 15): dijadwalkan setelah deposit:reconcile (23:00) supaya
// data deposit_reconciliations yang dibaca sudah paling baru.
Schedule::command('notifications:generate-alerts')->dailyAt('23:15');

// T-100 (Fase 16): notify:birthday dijadwalkan TEPAT SETELAH
// member:birthday-bonus (06:00) supaya bonus/kupon sudah tercatat
// sebelum pesan WA dikirim.
Schedule::command('notify:birthday')->dailyAt('06:05');
Schedule::command('notify:low-balance')->dailyAt('07:00');
Schedule::command('notify:receivable-due')->dailyAt('08:00');
Schedule::command('notify:weekly-summary')->weeklyOn(0, '19:00');
