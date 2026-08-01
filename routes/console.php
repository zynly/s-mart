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

// Fase 17-Darurat (temuan audit lintas-fase): sistem sudah memegang
// saldo deposit riil sejak Fase 4, tapi backup database TIDAK PERNAH
// dijadwalkan sampai sekarang — spatie/laravel-backup sudah ter-install
// & ter-publish (config/backup.php) tapi 0% aktif. ADR-0008: harian
// 02:00, retention lokal 30 hari (offsite Backblaze B2 menyusul saat
// kredensial tersedia — TIDAK menunda aktivasi backup lokal).
Schedule::command('backup:run')->dailyAt('02:00');
Schedule::command('backup:clean')->dailyAt('02:30');
Schedule::command('backup:monitor')->dailyAt('03:00');

// Temuan audit performa (Phase C, CRITICAL): docblock
// GenerateReportExportJob (T-089, ekspor laporan >5000 baris — SATU-
// SATUNYA jalur yang ADR-0008 izinkan untuk ekspor besar) sudah lama
// menyebut cron ini, tapi baris jadwalnya TIDAK PERNAH benar-benar
// ditulis — job cuma menumpuk di tabel `jobs`, tidak pernah dikonsumsi
// siapa pun, fitur ekspor besar rusak total secara diam-diam.
// `--stop-when-empty` wajib (bukan daemon terus-menerus) — shared
// hosting (ADR-0008) tanpa Supervisor, proses queue:work yang jalan
// selamanya akan langsung kena kill oleh hosting provider.
Schedule::command('queue:work --stop-when-empty --max-time=50')->everyMinute()->withoutOverlapping();
