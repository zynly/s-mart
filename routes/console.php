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
