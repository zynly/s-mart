<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\SettingsOverrideService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * T-103 (Fase 17). Cakupan sengaja dipersempit dari 9 tab spec asli —
 * lihat docs/tickets/INDEX.md §Fase 17 untuk alasan tab Notifikasi
 * (sudah env-driven, ADR-0010) dan Backup (baca langsung dari disk,
 * bukan form) tidak dibangun di sini.
 */
class SettingController extends Controller
{
    /**
     * @return array<string, array{label: string, group: string, fields: array<string, array{label: string, type: string, description?: string, rules: array<int, mixed>}>}>
     */
    public static function tabs(): array
    {
        return [
            'profil' => [
                'label' => 'Profil Toko',
                'group' => 'store_profile',
                'fields' => [
                    'name' => ['label' => 'Nama Toko', 'type' => 'string', 'rules' => ['nullable', 'string', 'max:255']],
                    'address' => ['label' => 'Alamat', 'type' => 'string', 'rules' => ['nullable', 'string', 'max:500']],
                    'phone' => ['label' => 'Telepon', 'type' => 'string', 'rules' => ['nullable', 'string', 'max:20']],
                ],
            ],
            'transaksi' => [
                'label' => 'Transaksi',
                'group' => 'pos',
                'fields' => [
                    'rounding_step' => ['label' => 'Kelipatan Pembulatan (Rp)', 'type' => 'integer', 'rules' => ['nullable', 'integer', 'min:1', 'max:10000']],
                    'rounding_mode' => ['label' => 'Mode Pembulatan', 'type' => 'string', 'description' => 'nearest, up, atau down', 'rules' => ['nullable', Rule::in(['nearest', 'up', 'down'])]],
                    'tax_percent' => ['label' => 'Pajak (%)', 'type' => 'decimal', 'rules' => ['nullable', 'numeric', 'min:0', 'max:100']],
                    'max_hold_per_cashier' => ['label' => 'Maks. Transaksi Ditahan per Kasir', 'type' => 'integer', 'rules' => ['nullable', 'integer', 'min:1', 'max:50']],
                    'session_auto_close_time' => ['label' => 'Jam Auto-Tutup Sesi', 'type' => 'string', 'description' => 'Format HH:MM', 'rules' => ['nullable', 'date_format:H:i']],
                    'max_discount_percent' => ['label' => 'Maks. Diskon Manual (%)', 'type' => 'decimal', 'rules' => ['nullable', 'numeric', 'min:0', 'max:100']],
                    'return_max_days' => ['label' => 'Batas Hari Retur', 'type' => 'integer', 'rules' => ['nullable', 'integer', 'min:0', 'max:365']],
                ],
            ],
            'deposit' => [
                'label' => 'Deposit & PIN',
                'group' => 'pos',
                'fields' => [
                    'deposit_min_topup' => ['label' => 'Minimal Top-Up (Rp)', 'type' => 'integer', 'rules' => ['nullable', 'integer', 'min:0', 'max:10000000']],
                    'allow_auto_topup' => ['label' => 'Izinkan Top-Up Otomatis (Midtrans/Pakasir)', 'type' => 'boolean', 'rules' => ['nullable', 'boolean']],
                    'allow_manual_topup' => ['label' => 'Izinkan Top-Up Transfer Manual (Upload Bukti)', 'type' => 'boolean', 'rules' => ['nullable', 'boolean']],
                    'manual_bank_name' => ['label' => 'Nama Bank Transfer Manual', 'type' => 'string', 'rules' => ['nullable', 'string', 'max:100']],
                    'manual_bank_account_number' => ['label' => 'Nomor Rekening Tujuan', 'type' => 'string', 'rules' => ['nullable', 'string', 'max:100']],
                    'manual_bank_account_name' => ['label' => 'Atas Nama Rekening', 'type' => 'string', 'rules' => ['nullable', 'string', 'max:100']],
                    'pin_length' => ['label' => 'Panjang PIN', 'type' => 'integer', 'rules' => ['nullable', Rule::in([4, 5, 6])]],
                    'pin_max_attempts' => ['label' => 'Maks. Percobaan PIN', 'type' => 'integer', 'rules' => ['nullable', 'integer', 'min:1', 'max:10']],
                    'pin_lockout_minutes' => ['label' => 'Lama Kunci PIN (menit)', 'type' => 'integer', 'rules' => ['nullable', 'integer', 'min:1', 'max:1440']],
                    // Batas atas SENGAJA ketat (bukan sekadar "integer positif") —
                    // temuan audit keamanan: field ini menentukan transaksi
                    // sebesar apa BEBAS PIN. Kalau divalidasi longgar, admin bisa
                    // set ke angka sangat besar dan mematikan proteksi PIN untuk
                    // SEMUA transaksi deposit.
                    'no_pin_threshold' => ['label' => 'Bebas PIN di Bawah (Rp)', 'type' => 'integer', 'rules' => ['nullable', 'integer', 'min:0', 'max:1000000']],
                    'receivable_due_days' => ['label' => 'Tempo Piutang (hari)', 'type' => 'integer', 'rules' => ['nullable', 'integer', 'min:0', 'max:365']],
                    // Gap G-03: sebelumnya hanya bisa diubah lewat config/server.
                    // Batas atas SENGAJA ketat (bukan sekadar "integer positif")
                    // — nilai ini menentukan berapa lama token approval PIN
                    // supervisor (void/diskon/harga/tutup sesi/dst, lihat
                    // AuthorizationService::issueToken()) tetap sah dipakai.
                    // Terlalu longgar = jendela penyalahgunaan token yang bocor/
                    // dipakai ulang makin lebar.
                    'pin_override_ttl_minutes' => ['label' => 'Masa Berlaku Token PIN Supervisor (menit)', 'type' => 'integer', 'description' => 'Berapa lama token approval PIN supervisor (void, diskon, ubah harga, tutup sesi selisih kas, dll.) tetap berlaku setelah PIN benar dimasukkan.', 'rules' => ['nullable', 'integer', 'min:1', 'max:15']],
                ],
            ],
            'struk' => [
                'label' => 'Struk',
                'group' => 'pos',
                'fields' => [
                    'receipt_width' => ['label' => 'Lebar Kertas Struk (mm)', 'type' => 'integer', 'description' => '58 atau 80', 'rules' => ['nullable', Rule::in([58, 80])]],
                ],
            ],
            'promo' => [
                'label' => 'Promo & Poin',
                'group' => 'pos',
                'fields' => [
                    'point_ratio' => ['label' => 'Rp per 1 Poin', 'type' => 'integer', 'rules' => ['nullable', 'integer', 'min:1', 'max:1000000']],
                    'point_value' => ['label' => 'Nilai 1 Poin (Rp)', 'type' => 'integer', 'rules' => ['nullable', 'integer', 'min:0', 'max:1000000']],
                    'point_expiry_months' => ['label' => 'Kedaluwarsa Poin (bulan)', 'type' => 'integer', 'rules' => ['nullable', 'integer', 'min:0', 'max:60']],
                    'birthday_bonus_amount' => ['label' => 'Bonus Ulang Tahun (Rp)', 'type' => 'integer', 'rules' => ['nullable', 'integer', 'min:0', 'max:1000000']],
                    'birthday_bonus_mode' => ['label' => 'Mode Bonus Ulang Tahun', 'type' => 'string', 'description' => 'deposit atau coupon', 'rules' => ['nullable', Rule::in(['deposit', 'coupon'])]],
                    'birthday_coupon_discount_percent' => ['label' => 'Diskon Kupon Ultah (%)', 'type' => 'decimal', 'rules' => ['nullable', 'numeric', 'min:0', 'max:100']],
                    'birthday_coupon_valid_days' => ['label' => 'Masa Berlaku Kupon Ultah (hari)', 'type' => 'integer', 'rules' => ['nullable', 'integer', 'min:0', 'max:365']],
                    'clearance_days' => ['label' => 'Ambang "Mendekati Kadaluwarsa" (hari)', 'type' => 'integer', 'rules' => ['nullable', 'integer', 'min:0', 'max:365']],
                ],
            ],
            'inventori' => [
                'label' => 'Inventori',
                'group' => 'pos',
                'fields' => [
                    'low_stock_threshold_percent' => ['label' => 'Ambang Stok Menipis (%)', 'type' => 'decimal', 'rules' => ['nullable', 'numeric', 'min:0', 'max:100']],
                    'opname_tolerance_percent' => ['label' => 'Toleransi Selisih Opname (%)', 'type' => 'decimal', 'rules' => ['nullable', 'numeric', 'min:0', 'max:100']],
                ],
            ],
        ];
    }

    public function index(Request $request): Response
    {
        $activeTab = $request->query('section', 'profil');
        $tabs = self::tabs();

        $stored = Setting::query()->get()->keyBy(fn (Setting $s) => "{$s->group}.{$s->key}");

        $sections = [];
        foreach ($tabs as $key => $tab) {
            $values = [];
            // 'rules' berisi objek Rule::in(...) yang bukan untuk konsumsi
            // frontend (validasi tetap dijalankan server-side di update()) —
            // dibuang di sini supaya tidak ikut ke-serialize sebagai prop Inertia.
            $fields = [];

            foreach ($tab['fields'] as $fieldKey => $meta) {
                $storedRow = $stored->get("{$tab['group']}.{$fieldKey}");
                $values[$fieldKey] = $storedRow
                    ? $storedRow->castValue()
                    : ($tab['group'] === 'pos' ? config("pos.{$fieldKey}") : null);

                $fields[$fieldKey] = ['label' => $meta['label'], 'type' => $meta['type'], 'description' => $meta['description'] ?? null];
            }

            $sections[$key] = [
                'label' => $tab['label'],
                'fields' => $fields,
                'values' => $values,
            ];
        }

        return Inertia::render('Admin/Settings/Index', [
            'activeTab' => $activeTab,
            'sections' => $sections,
        ]);
    }

    public function update(Request $request, string $section): RedirectResponse
    {
        $tabs = self::tabs();
        abort_unless(isset($tabs[$section]), 404);

        $tab = $tabs[$section];
        $rules = [];
        foreach ($tab['fields'] as $fieldKey => $meta) {
            $rules[$fieldKey] = $meta['rules'] ?? ['nullable'];
        }
        $data = $request->validate($rules);

        foreach ($tab['fields'] as $fieldKey => $meta) {
            if (! array_key_exists($fieldKey, $data)) {
                continue;
            }

            Setting::query()->updateOrCreate(
                ['group' => $tab['group'], 'key' => $fieldKey],
                [
                    'value' => $data[$fieldKey],
                    'type' => $meta['type'],
                    'label' => $meta['label'],
                    'description' => $meta['description'] ?? null,
                ]
            );
        }

        SettingsOverrideService::forget();

        return redirect()
            ->route('admin.settings.index', ['section' => $section])
            ->with('success', "Pengaturan {$tab['label']} disimpan.");
    }
}
