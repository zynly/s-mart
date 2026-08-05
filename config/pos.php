<?php

return [
    'rounding_step' => 100,
    'rounding_mode' => 'nearest', // nearest|up|down
    'tax_percent' => 0, // PPN, default 0 untuk pesantren
    'receipt_width' => 58, // 58 atau 80 mm
    'low_stock_threshold_percent' => 20,
    'opname_tolerance_percent' => 0.5,
    'session_auto_close_time' => '23:59',
    'max_hold_per_cashier' => 5,
    'deposit_min_topup' => 10000,
    // REVISI-R1-v2.md §6.3 — top-up tunai di atas nominal ini wajib PIN
    // supervisor (pengaman kedua di atas rekonsiliasi kas saat tutup sesi).
    'topup_cash_pin_threshold' => 200000,
    // REVISI-R1-v2.md §6.3 Jalur B — top-up TRANSFER wali di atas
    // nominal ini wajib PIN supervisor/owner saat admin menyetujuinya.
    'topup_transfer_pin_threshold' => 500000,
    'pin_length' => 6,
    'pin_max_attempts' => 3,
    'pin_lockout_minutes' => 15,
    // Audit Fase 1: token otorisasi supervisor (dibuat setelah PIN benar)
    // berlaku berapa menit sebelum harus diminta ulang — jendela sempit
    // sengaja, cukup untuk submit form yang sedang dibuka, bukan disimpan
    // lama-lama di client.
    'pin_override_ttl_minutes' => 2,
    'no_pin_threshold' => 20000, // bebas PIN di bawah nominal ini
    'return_max_days' => 7,
    'max_discount_percent' => 50,
    'birthday_bonus_amount' => 10000,
    'point_ratio' => 10000, // Rp 10.000 = 1 poin
    'point_value' => 100, // 1 poin = Rp 100
    'point_expiry_months' => 12,
    'receivable_due_days' => 30, // default tempo piutang anggota (metode Kredit)
    'clearance_days' => 7, // ambang "mendekati kadaluwarsa" untuk promo clearance
    'birthday_bonus_mode' => 'deposit', // deposit|coupon
    'birthday_coupon_discount_percent' => 10,
    'birthday_coupon_valid_days' => 7,
];
