# T-007 — Seeder Roles & Permissions Granular (format `modul.aksi`)

**Fase induk:** Fase 1 (Autentikasi, Role & Pengguna)
**Estimasi:** M (≤4 jam)

## Deskripsi

`RolePermissionSeeder` yang membuat seluruh permission (32 modul × 7
aksi + permission khusus) dan memetakannya ke 6 role staf, serta
`UserSeeder` untuk akun contoh tiap role.

## Kriteria Penerimaan

- [ ] `RolePermissionSeeder` membuat permission untuk 32 modul (user,
      role, outlet, category, product, unit, brand, supplier, member,
      card, deposit, topup, withdrawal, pos, sale, sale_return,
      purchase, purchase_order, purchase_return, consignment, stock,
      opname, transfer, adjustment, promo, coupon, cash, debt,
      receivable, journal, ledger, report, setting, backup) × aksi
      (view, create, update, delete, approve, export, print)
- [ ] Permission khusus dibuat: `sale.void`, `sale.change_price`,
      `sale.discount_over_limit`, `product.view_cost`, `deposit.adjust`,
      `receivable.delete` (bukan `receivable.write_off` — ADR-0005),
      `period.close`, `system.reset`
- [ ] 6 role dibuat (owner, admin, supervisor, cashier, warehouse,
      treasurer) dengan permission sesuai matriks kewenangan di
      `CONTEXT.md` § Aktor — owner dapat semua + eksklusif
      (`receivable.delete`, `deposit.adjust`, `system.reset`,
      `period.close`, `product.view_cost`)
- [ ] `UserSeeder`: 1 owner (`owner`/password default terdokumentasi di
      `.env.example`, bukan hardcode di kode), 1 admin, 1 supervisor,
      2 cashier, 1 warehouse, 1 treasurer
- [ ] `php artisan migrate:fresh --seed` berhasil tanpa error, dan
      `php artisan tinker` → `User::first()->getAllPermissions()->count()`
      menampilkan angka > 0 sesuai role

## Blocking Edges

- T-006 harus sudah selesai.

## Referensi

- CONTEXT.md § Aktor
- ADR-0005 (permission `receivable.delete`)
- `PROMPT-POS-SKILLAGE-MART.md` § Fase 1, bagian 3, 7

## Catatan Implementasi

- Jangan hardcode password akun seeder di kode sumber — pakai
  `env('SEEDER_DEFAULT_PASSWORD', 'password')` atau sejenis, supaya
  tidak tersimpan permanen di git history bila repo publik di kemudian
  hari.
- Permission `guardian` (wali) **tidak** dibuat di sini — wali bukan
  `User` melainkan model `Guardian` terpisah tanpa sistem permission
  spatie (akses portal wali dibatasi lewat middleware auth guard
  terpisah, bukan permission granular). Lihat T-095/T-096.
