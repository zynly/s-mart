<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * T-103 (Fase 17). Tiket asli menyasar `config/pos.php` secara literal,
 * tapi menulis ulang file .php di disk lewat HTTP request tidak standar
 * untuk produksi (butuh izin write filesystem di shared hosting, tidak
 * atomik, dan bentrok dengan `php artisan config:cache`). Sebagai
 * gantinya: tabel `settings` (key-value, sesuai spec asli) HANYA
 * menyimpan override — nilai efektif tetap ditimpakan ke `config()`
 * lewat method ini, dipanggil sekali di `AppServiceProvider::boot()`.
 * Semua pemanggil `config('pos.xxx')` yang sudah tersebar di codebase
 * TIDAK perlu diubah sama sekali.
 */
class SettingsOverrideService
{
    public static function apply(): void
    {
        try {
            $rows = Cache::remember('settings.pos.overrides', 3600, function () {
                return Setting::query()->where('group', 'pos')->get(['key', 'value', 'type']);
            });
        } catch (\Throwable) {
            // Tabel belum ada (mis. sebelum `php artisan migrate` pertama
            // kali jalan) — abaikan, config/pos.php tetap jadi sumber
            // nilai default seperti sebelum fitur ini ada.
            return;
        }

        $overrides = [];
        foreach ($rows as $row) {
            $overrides['pos.'.$row->key] = $row->castValue();
        }

        if ($overrides !== []) {
            config($overrides);
        }
    }

    public static function forget(): void
    {
        Cache::forget('settings.pos.overrides');
    }
}
