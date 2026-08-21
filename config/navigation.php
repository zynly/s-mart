<?php

/**
 * T-116 (Fase UI-01). Satu sumber kebenaran navigasi — dibaca
 * `App\Services\NavigationService`, dibagikan ke frontend lewat
 * Inertia shared prop `navigation` (`HandleInertiaRequests`), BUKAN
 * menu hardcoded di React. Kunci luar ('admin') menyisakan ruang
 * untuk portal lain nanti (mis. 'wali' — Fase 16) tanpa migrasi
 * struktur, sesuai skeleton yang sudah disiapkan Fase 0.
 *
 * 'admin' berisi 16 entri (1 Dashboard + 15 modul) memetakan 36 route
 * admin nyata (lihat rencana Fase UI-01 §Temuan B). Halaman yang jadi
 * anggota grup (mis. Produk/Kategori/Brand/Satuan di bawah menu
 * "Produk") TIDAK digabung jadi satu controller — masing-masing tetap
 * route sendiri, dihubungkan lewat <PageTabs> di halamannya sendiri
 * (bukan di sini). 'permissions' dicek OR (user cukup punya SALAH
 * SATU); array kosong = selalu tampil untuk siapa pun yang login.
 * 'badge' disiapkan sebagai kunci opsional untuk perluasan nanti
 * (badge dinamis, Fase 15) — TIDAK ada modul yang mengisinya sekarang.
 */
return [
    'admin' => [
        [
            'group' => 'Dashboard',
            'items' => [
                [
                    'key' => 'dashboard',
                    'label' => 'Dashboard',
                    'route' => 'admin.dashboard',
                    'icon' => 'LayoutDashboard',
                    'permissions' => [],
                ],
            ],
        ],
        [
            'group' => 'Operasional',
            'items' => [
                [
                    'key' => 'pos',
                    'label' => 'Kasir',
                    'route' => 'pos.index',
                    'icon' => 'ShoppingCart',
                    'permissions' => ['pos.view'],
                ],
                [
                    'key' => 'cashier-session',
                    'label' => 'Sesi & Kas',
                    'route' => 'admin.cashier-session.index',
                    'icon' => 'Wallet',
                    'permissions' => ['pos.view', 'cash.view'],
                ],
                [
                    'key' => 'deposit',
                    'label' => 'Deposit',
                    'route' => 'admin.deposit.index',
                    'icon' => 'CreditCard',
                    'permissions' => ['deposit.view', 'topup.view'],
                ],
                [
                    'key' => 'sale-returns',
                    'label' => 'Retur & Koreksi',
                    'route' => 'admin.sale-returns.index',
                    'icon' => 'Undo2',
                    'permissions' => ['sale_return.view', 'adjustment.view'],
                ],
            ],
        ],
        [
            'group' => 'Persediaan',
            'items' => [
                [
                    'key' => 'products',
                    'label' => 'Produk',
                    'route' => 'admin.products.index',
                    'icon' => 'Package',
                    'permissions' => ['product.view'],
                ],
                [
                    'key' => 'stock',
                    'label' => 'Stok',
                    'route' => 'admin.stock.index',
                    'icon' => 'Boxes',
                    'permissions' => ['stock.view'],
                ],
                [
                    'key' => 'purchases',
                    'label' => 'Pembelian',
                    'route' => 'admin.purchases.index',
                    'icon' => 'Truck',
                    'permissions' => ['purchase.view', 'purchase_order.view', 'consignment.view'],
                ],
            ],
        ],
        [
            'group' => 'Keanggotaan',
            'items' => [
                [
                    'key' => 'members',
                    'label' => 'Anggota',
                    'route' => 'admin.members.index',
                    'icon' => 'Users',
                    'permissions' => ['member.view'],
                ],
                [
                    'key' => 'promos',
                    'label' => 'Promo',
                    'route' => 'admin.promos.index',
                    'icon' => 'Tag',
                    'permissions' => ['promo.view', 'coupon.view'],
                ],
            ],
        ],
        [
            'group' => 'Keuangan',
            'items' => [
                [
                    'key' => 'debts',
                    'label' => 'Hutang & Piutang',
                    'route' => 'admin.debts.index',
                    'icon' => 'HandCoins',
                    'permissions' => ['debt.view', 'receivable.view'],
                ],
                [
                    'key' => 'accounts',
                    'label' => 'Akuntansi',
                    'route' => 'admin.accounts.index',
                    'icon' => 'BookOpen',
                    'permissions' => ['ledger.view', 'journal.view', 'setting.view'],
                ],
                [
                    'key' => 'reports',
                    'label' => 'Laporan',
                    'route' => 'admin.reports.index',
                    'icon' => 'FileBarChart',
                    'permissions' => ['report.view'],
                ],
            ],
        ],
        [
            'group' => 'Sistem',
            'items' => [
                [
                    'key' => 'suppliers',
                    'label' => 'Mitra & Outlet',
                    'route' => 'admin.suppliers.index',
                    'icon' => 'Building2',
                    'permissions' => ['supplier.view', 'setting.view'],
                ],
                [
                    'key' => 'users',
                    'label' => 'Pengguna & Sistem',
                    'route' => 'admin.users.index',
                    'icon' => 'UserCog',
                    'permissions' => ['user.view', 'role.view'],
                ],
                [
                    'key' => 'settings',
                    'label' => 'Pengaturan',
                    'route' => 'admin.settings.index',
                    'icon' => 'Settings',
                    'permissions' => ['setting.view', 'system.reset'],
                ],
                [
                    'key' => 'integrations',
                    'label' => 'Integrasi',
                    'route' => 'admin.integrations.index',
                    'icon' => 'Cpu',
                    'permissions' => ['setting.view', 'system.reset'],
                ],
            ],
        ],
    ],
];
