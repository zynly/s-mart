<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Gap G-04. Spec asli minta dua tombol reset ("data transaksi" dan
 * "seluruh sistem") — SystemResetController hanya membangun yang pertama
 * sebagai endpoint web (lihat komentar di sana): reset total (termasuk
 * data master & akun pengguna) yang bisa diklik siapa pun berperan owner
 * dari browser adalah risiko yang tidak proporsional untuk aplikasi yang
 * memegang uang sungguhan. Command INI adalah satu-satunya jalur resmi
 * untuk reset total — CLI saja, TIDAK PERNAH didaftarkan sebagai route
 * HTTP apa pun. Dirancang supaya tidak bisa "kepencet" tidak sengaja:
 * konfirmasi berlapis (nama aplikasi -> ya/tidak eksplisit -> frasa
 * khusus kalau production), wajib --force untuk production, dan logging
 * ke activity log + storage/logs sebelum benar-benar dieksekusi.
 */
class SystemResetTotal extends Command
{
    protected $signature = 'system:reset-total {--force : Wajib disertakan untuk menjalankan di environment production}';

    protected $description = 'Reset TOTAL sistem (migrate:fresh --seed) — menghapus SEMUA data (transaksi, master data, akun pengguna, pengaturan). CLI saja, tidak pernah diekspos lewat web.';

    public function handle(): int
    {
        $environment = app()->environment();

        // Lapis 1 — pembatasan environment: production wajib --force
        // eksplisit, mencegah perintah ini tereksekusi tidak sengaja
        // (mis. salah tempel dari riwayat shell/dokumentasi/CI script).
        if ($environment === 'production' && ! $this->option('force')) {
            $this->error('Environment ini "production". Tambahkan --force secara eksplisit untuk melanjutkan — ini pengaman terakhir, bukan formalitas.');

            return self::FAILURE;
        }

        $this->newLine();
        $this->line('<fg=red;options=bold>PERINGATAN: PERINTAH INI MENGHAPUS SELURUH DATA.</>');
        $this->line("Environment saat ini: <fg=yellow>{$environment}</>");
        $this->line('Akan menjalankan `migrate:fresh --seed` — SEMUA tabel (transaksi, produk, anggota, akun pengguna, pengaturan) dihapus dan diganti data seeder awal. Tidak bisa dibatalkan lewat aplikasi.');
        $this->newLine();

        // Lapis 2 — ketik nama aplikasi persis (non-interactive/cron:
        // ask() mengembalikan null tanpa TTY, otomatis tidak cocok).
        $expectedName = (string) config('app.name');

        if ($this->ask("Ketik nama aplikasi persis untuk melanjutkan (\"{$expectedName}\")") !== $expectedName) {
            $this->error('Nama tidak cocok. Dibatalkan — tidak ada perubahan dilakukan.');

            return self::FAILURE;
        }

        // Lapis 3 — konfirmasi eksplisit, default TIDAK (harus benar-benar diketik "yes").
        if (! $this->confirm('Saya paham SELURUH data (termasuk akun pengguna & data master) akan hilang permanen. Lanjutkan?', false)) {
            $this->error('Dibatalkan oleh pengguna.');

            return self::FAILURE;
        }

        // Lapis 4 — khusus production: frasa tambahan yang tidak mudah diketik tanpa sadar.
        if ($environment === 'production') {
            $phrase = 'RESET TOTAL PRODUKSI';

            if ($this->ask("Ini environment PRODUCTION. Ketik persis \"{$phrase}\" untuk melanjutkan") !== $phrase) {
                $this->error('Frasa tidak cocok. Dibatalkan — tidak ada perubahan dilakukan.');

                return self::FAILURE;
            }
        }

        $context = [
            'environment' => $environment,
            'os_user' => get_current_user(),
            'hostname' => gethostname(),
            'at' => now()->toDateTimeString(),
        ];

        Log::warning('system:reset-total dijalankan', $context);
        activity('system')->withProperties($context)->log('Reset TOTAL sistem dimulai lewat command-line');

        $this->warn('Membuat cadangan terakhir sebelum reset...');
        $this->call('backup:run');

        $this->warn('Menjalankan migrate:fresh --seed...');
        $this->call('migrate:fresh', ['--seed' => true, '--force' => true]);

        activity('system')->withProperties($context)->log('Reset TOTAL sistem selesai dijalankan lewat command-line');
        $this->info('Reset total selesai. Sistem kembali ke kondisi seeder awal.');

        return self::SUCCESS;
    }
}
