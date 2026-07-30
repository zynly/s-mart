# T-006 — Migration Users + Tabel spatie/laravel-permission (7 Role)

**Fase induk:** Fase 1 (Autentikasi, Role & Pengguna)
**Estimasi:** M (≤4 jam)

## Deskripsi

Menambah kolom khusus POS ke tabel `users` bawaan Laravel (yang sudah
ada dari T-001) dan menyiapkan struktur permission granular untuk 7
role: owner, admin, supervisor, cashier, warehouse, treasurer, guardian
(guardian sebenarnya model `Guardian` terpisah — lihat T-095, bukan
`User`; tabel ini untuk 6 role staf).

## Kriteria Penerimaan

- [ ] Migration menambah ke `users`: `username` (unique), `phone`,
      `avatar`, `employee_code`, `outlet_id` (nullable = akses semua
      outlet), `pin` (hashed), `is_active`, `last_login_at`,
      `last_login_ip`, `last_login_user_agent`, `two_factor_enabled`,
      `two_factor_secret` (encrypted), `two_factor_recovery_codes`
      (encrypted), `SoftDeletes`
- [ ] Migration tabel bawaan `spatie/laravel-permission` (`roles`,
      `permissions`, `model_has_roles`, `model_has_permissions`,
      `role_has_permissions`) — sudah dipublish di T-001, tinggal
      dijalankan
- [ ] Permission dibuat untuk 32 modul (user, role, outlet, category,
      product, unit, brand, supplier, member, card, deposit, topup,
      withdrawal, pos, sale, sale_return, purchase, purchase_order,
      purchase_return, consignment, stock, opname, transfer, adjustment,
      promo, coupon, cash, debt, receivable, journal, ledger, report,
      setting, backup) × aksi (view, create, update, delete, approve,
      export, print)
- [ ] Permission khusus: `sale.void`, `sale.change_price`,
      `sale.discount_over_limit`, `product.view_cost`, `deposit.adjust`,
      `receivable.delete` (bukan `receivable.write_off` — lihat ADR-0005
      & catatan konflik di bawah), `period.close`, `system.reset`
- [ ] 7 role dibuat dengan permission sesuai tabel kewenangan di
      `docs/CONTEXT.md` § Aktor
- [ ] User model pakai trait `Spatie\Permission\Traits\HasRoles` (sudah
      ditambahkan di T-001)

## Blocking Edges

- T-001 harus sudah selesai.

## Referensi

- CONTEXT.md § Aktor
- SPEC.md § 2 (Aktor & Peran), § 4 poin 17
- `PROMPT-POS-SKILLAGE-MART.md` § Fase 1, bagian 1–3
- `CATATAN-PERBAIKAN.md` § Fase 1 (konflik istilah receivable)

## Catatan Implementasi

- **Konflik istilah wajib diikuti:** dokumen asli Fase 1 menyebut
  permission `receivable.write_off`, tapi Fase 9 UI menyebut "hapus
  piutang". Keputusan final (`CATATAN-PERBAIKAN.md`): permission bernama
  **`receivable.delete`**, label UI **"Hapus Piutang"**, hanya untuk
  owner, hanya piutang >90 hari. Jangan pakai `write_off` di kode manapun.
- Field tambahan `two_factor_*` sudah tersedia dari Laravel Fortify
  (terpasang di T-001) — cukup pastikan kolom ini konsisten dipakai, tidak
  perlu migration terpisah untuk Fortify sendiri.
- `outlet_id` nullable secara sengaja berarti "akses semua outlet" — bukan
  representasi "belum pilih outlet". Untuk skala MVP (satu outlet), field
  ini disiapkan strukturnya tapi belum kritikal sampai multi-outlet
  (di luar scope MVP, lihat SPEC.md § Non-Goals).
