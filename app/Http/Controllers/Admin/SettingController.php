<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\SettingsOverrideService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
     * @return array<string, array{label: string, group: string, fields: array<string, array{label: string, type: string, description?: string}>}>
     */
    public static function tabs(): array
    {
        return [
            'profil' => [
                'label' => 'Profil Toko',
                'group' => 'store_profile',
                'fields' => [
                    'name' => ['label' => 'Nama Toko', 'type' => 'string'],
                    'address' => ['label' => 'Alamat', 'type' => 'string'],
                    'phone' => ['label' => 'Telepon', 'type' => 'string'],
                ],
            ],
            'transaksi' => [
                'label' => 'Transaksi',
                'group' => 'pos',
                'fields' => [
                    'rounding_step' => ['label' => 'Kelipatan Pembulatan (Rp)', 'type' => 'integer'],
                    'rounding_mode' => ['label' => 'Mode Pembulatan', 'type' => 'string', 'description' => 'nearest, up, atau down'],
                    'tax_percent' => ['label' => 'Pajak (%)', 'type' => 'decimal'],
                    'max_hold_per_cashier' => ['label' => 'Maks. Transaksi Ditahan per Kasir', 'type' => 'integer'],
                    'session_auto_close_time' => ['label' => 'Jam Auto-Tutup Sesi', 'type' => 'string', 'description' => 'Format HH:MM'],
                    'max_discount_percent' => ['label' => 'Maks. Diskon Manual (%)', 'type' => 'decimal'],
                    'return_max_days' => ['label' => 'Batas Hari Retur', 'type' => 'integer'],
                ],
            ],
            'deposit' => [
                'label' => 'Deposit & PIN',
                'group' => 'pos',
                'fields' => [
                    'deposit_min_topup' => ['label' => 'Minimal Top-Up (Rp)', 'type' => 'integer'],
                    'pin_length' => ['label' => 'Panjang PIN', 'type' => 'integer'],
                    'pin_max_attempts' => ['label' => 'Maks. Percobaan PIN', 'type' => 'integer'],
                    'pin_lockout_minutes' => ['label' => 'Lama Kunci PIN (menit)', 'type' => 'integer'],
                    'no_pin_threshold' => ['label' => 'Bebas PIN di Bawah (Rp)', 'type' => 'integer'],
                    'receivable_due_days' => ['label' => 'Tempo Piutang (hari)', 'type' => 'integer'],
                ],
            ],
            'struk' => [
                'label' => 'Struk',
                'group' => 'pos',
                'fields' => [
                    'receipt_width' => ['label' => 'Lebar Kertas Struk (mm)', 'type' => 'integer', 'description' => '58 atau 80'],
                ],
            ],
            'promo' => [
                'label' => 'Promo & Poin',
                'group' => 'pos',
                'fields' => [
                    'point_ratio' => ['label' => 'Rp per 1 Poin', 'type' => 'integer'],
                    'point_value' => ['label' => 'Nilai 1 Poin (Rp)', 'type' => 'integer'],
                    'point_expiry_months' => ['label' => 'Kedaluwarsa Poin (bulan)', 'type' => 'integer'],
                    'birthday_bonus_amount' => ['label' => 'Bonus Ulang Tahun (Rp)', 'type' => 'integer'],
                    'birthday_bonus_mode' => ['label' => 'Mode Bonus Ulang Tahun', 'type' => 'string', 'description' => 'deposit atau coupon'],
                    'birthday_coupon_discount_percent' => ['label' => 'Diskon Kupon Ultah (%)', 'type' => 'decimal'],
                    'birthday_coupon_valid_days' => ['label' => 'Masa Berlaku Kupon Ultah (hari)', 'type' => 'integer'],
                    'clearance_days' => ['label' => 'Ambang "Mendekati Kadaluwarsa" (hari)', 'type' => 'integer'],
                ],
            ],
            'inventori' => [
                'label' => 'Inventori',
                'group' => 'pos',
                'fields' => [
                    'low_stock_threshold_percent' => ['label' => 'Ambang Stok Menipis (%)', 'type' => 'decimal'],
                    'opname_tolerance_percent' => ['label' => 'Toleransi Selisih Opname (%)', 'type' => 'decimal'],
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
            foreach ($tab['fields'] as $fieldKey => $meta) {
                $storedRow = $stored->get("{$tab['group']}.{$fieldKey}");
                $values[$fieldKey] = $storedRow
                    ? $storedRow->castValue()
                    : ($tab['group'] === 'pos' ? config("pos.{$fieldKey}") : null);
            }

            $sections[$key] = [
                'label' => $tab['label'],
                'fields' => $tab['fields'],
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
        foreach (array_keys($tab['fields']) as $fieldKey) {
            $rules[$fieldKey] = ['nullable'];
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
