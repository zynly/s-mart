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
    'pin_length' => 6,
    'pin_max_attempts' => 3,
    'pin_lockout_minutes' => 15,
    'no_pin_threshold' => 20000, // bebas PIN di bawah nominal ini
    'return_max_days' => 7,
    'max_discount_percent' => 50,
    'birthday_bonus_amount' => 10000,
    'point_ratio' => 10000, // Rp 10.000 = 1 poin
    'point_value' => 100, // 1 poin = Rp 100
    'point_expiry_months' => 12,
];
