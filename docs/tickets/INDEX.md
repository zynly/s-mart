# Backlog Skillage Mart POS

Total: **119 tiket** (dalam rentang ideal 100–130 dari `pre-03-spec-dan-tiket.md`).
Disusun dari struktur asli `PROMPT-POS-SKILLAGE-MART.md` (Fase 1–18) +
`fase-19-storefront-publik.md` + `fase-ui-01-v2.md`, mengikuti sub-bagian
nyata tiap fase (TABEL, SERVICE, HALAMAN, dst) sebagai unit tiket.

**Detail lengkap (7 bagian: Deskripsi, Kriteria Penerimaan, Blocking
Edges, Estimasi, Referensi, Catatan Implementasi) sudah ditulis untuk
Fase 0 (selesai), Fase 1 (siap dikerjakan), dan 10 tiket jalur kritis
lintas-fase** — file lainnya (Fase 2–19, UI-01) masih berupa entri judul
di index ini; detail penuh ditulis saat fase tersebut mulai dikerjakan
(just-in-time), sesuai keputusan cakupan kerja.

## Legenda Status

- ⬜ Belum mulai
- 🟨 Sedang dikerjakan
- ✅ Selesai
- ⛔ Dibatalkan
- 🔑 Tiket jalur kritis (critical path)

---

## Fase 0 — Fondasi Proyek `[SELESAI]`

- [x] ✅ 🔑 [T-001](T-001-instalasi-laravel-inertia-react.md) — Instalasi Laravel 12 + Inertia + React + TypeScript
- [x] ✅ [T-002](T-002-konfigurasi-tailwind-shadcn.md) — Konfigurasi Tailwind v4 + token navy + shadcn/ui (Radix)
- [x] ✅ [T-003](T-003-struktur-folder-namespace.md) — Struktur folder backend & frontend + 5 layout
- [x] ✅ [T-004](T-004-helper-money-referencegenerator.md) — Helper Money (PHP+TS) & ReferenceGenerator
- [x] ✅ [T-005](T-005-komponen-custom-datatable.md) — 11 komponen custom (Money, DataTable, dst) + halaman uji

## Fase 1 — Autentikasi, Role & Pengguna `[SELESAI]`

- [x] ✅ 🔑 [T-006](T-006-migration-users-spatie-permission.md) — Migration users + tabel spatie/permission (7 role)
- [x] ✅ [T-007](T-007-seeder-roles-permissions.md) — Seeder roles & permissions granular (format `modul.aksi`)
- [x] ✅ [T-008](T-008-authorizationservice-pin.md) — `AuthorizationService::requestOverride()` (PIN otorisasi supervisor)
- [x] ✅ [T-009](T-009-halaman-login-crud-pengguna.md) — Halaman login + CRUD pengguna (React pages, Fortify)
- [x] ✅ [T-010](T-010-middleware-session-lifetime.md) — Middleware `AdjustSessionLifetime` (timeout per role)
- [x] ✅ [T-011](T-011-middleware-idempotency-rate-limit.md) — Middleware `EnsureIdempotencyKey` + rate limit login (5x/menit/IP)

**Blocking:** Fase 0 selesai.

## Fase 2 — Master Data `[SELESAI]`

- [x] ✅ 🔑 [T-012](T-012-migration-products.md) — Migration products + kategori + konversi satuan
- [x] ✅ T-013 — Migration `product_barcodes` (multi-barcode per produk)
- [x] ✅ T-014 — Migration `product_prices` (immutable — tanpa `updated_at`, effective_from/to)
- [x] ✅ T-015 — Migration `product_images` (multi-gambar) + hapus kolom `products.image`
- [x] ✅ T-016 — Kolom storefront: `is_visible_public`, `slug`, `description_public`, `public_order`
- [x] ✅ T-017 — `ProductService` + halaman CRUD produk (DataTable + form, HPP hidden via permission)
- [x] ✅ T-018 — Seeder produk & kategori contoh

**Blocking:** Fase 1 selesai (butuh role `warehouse`/`admin`).

## Fase 3 — Anggota & Kartu `[SELESAI]`

- [x] ✅ T-019 — Migration `member_levels` + `members` + `member_cards` (`receivable_limit`, tanpa `allow_negative`/`credit_limit`)
- [x] ✅ T-020 — `ReferenceGenerator::generateMemberNumber()` nomor anggota otomatis per tipe+angkatan
- [x] ✅ T-021 — `MemberService` + `CardService` (buat anggota, terbitkan/ganti kartu — saldo di `Member`, bukan di kartu, jadi ganti kartu tidak butuh ledger `card_transfer_in`/`out`; itu disisipkan di Fase 4 bila diperlukan) + `MemberPinService` + `MemberLimitService`
- [x] ✅ T-022 — `CardPrintService` cetak kartu barcode Code128 massal (dompdf + picqer/php-barcode-generator, A4 2 kolom)
- [x] ✅ T-023 — Halaman CRUD anggota (tab Identitas/Wali/Level & Limit) + reset PIN + terbitkan ulang kartu + cetak kartu (satuan & massal)
- [x] ✅ T-024 — Event `CategoryDeleting` + Listener `RemoveCategoryFromMemberBlocklist` (cleanup `blocked_categories`)

**Blocking:** Fase 2 selesai.

## Fase 4 — Deposit & Saldo `[SELESAI]`

- [x] ✅ T-025 — Migration `deposit_transactions` (ledger append-only) + `deposit_reconciliations` + `topup_requests`
- [x] ✅ 🔑 [T-026](T-026-depositservice-lockforupdate.md) — `DepositService::record()` dengan `lockForUpdate()` + `idempotency_key` wajib
- [x] ✅ T-027 — Command `deposit:reconcile` (+ `--fix`), terjadwal harian 23:00
- [x] ✅ T-028 — Halaman top-up & riwayat mutasi saldo (+ dialog Tarik Saldo & Sesuaikan Saldo)
- [x] ✅ T-029 — Command `member:birthday-bonus` (`birthday_bonus_amount`), terjadwal harian 06:00, maksimal sekali/tahun
- [x] ✅ T-030 — `card_transfer_out`/`card_transfer_in` via `DepositService::transferCard()`, dipanggil otomatis dari `CardService::reissue()`

**Blocking:** Fase 3 selesai.

## Fase 5 — Inventory & Stock Layer (FEFO) `[SELESAI]`

- [x] ✅ 🔑 [T-031](T-031-migration-stock-layers.md) — Migration `stock_layers` + `stock_layer_consumptions` + `stock_movements` + `stocks` (cache)
- [x] ✅ 🔑 [T-032](T-032-stockservice-fefo-consume.md) — `StockService::consume()` FEFO (`expired_at` ASC NULLS LAST, `received_at` ASC)
- [x] ✅ T-033 — `StockService::returnToLayer()`: retur kembalikan ke layer asal, tandai `is_returned`
- [x] ✅ T-034 — Command `stock:check-expiry` (+ `stock:recalculate-cache`), chunked, terjadwal harian 05:00
- [x] ✅ T-035 — Halaman Stok: Ringkasan (badge Aman/Rendah/Habis), Kartu Stok per produk, Akan Kadaluwarsa/Kadaluwarsa

**Blocking:** Fase 2 selesai (independen dari Fase 3/4).

## Fase 6 — Pembelian, Konsinyasi & Hutang `[SELESAI]`

- [x] ✅ T-036 — Migration `purchase_orders` + `purchase_order_items`
- [x] ✅ T-037 — Migration `purchases` + `purchase_items` + `purchase_other_costs` + `purchase_returns` + `purchase_return_items` + `debts` + `debt_payments`
- [x] ✅ T-038 — Migration konsinyasi (`consignment_settlements` + items; `is_consignment` di `stock_layers` sudah ada dari Fase 5, tanpa jurnal/hutang saat terima — ADR-0006)
- [x] ✅ T-039 — `PurchaseService` (createOrder/approveOrder, receive → stock layer + movement, allocateOtherCosts proporsional, processReturn)
- [x] ✅ T-040 — `DebtService` (createFromPurchase, pay bercicilan, reduceFromReturn, getAging, getDueSoon) + `ConsignmentService` (calculateSettlement dari stock_layer_consumptions, settle, approve, markPaid)
- [x] ✅ T-041 — Halaman Purchase Order, Pembelian (terima barang + retur), Hutang (aging + bayar cicil)
- [x] ✅ T-042 — Halaman Konsinyasi & settlement pemilik barang

**Blocking:** Fase 5 selesai.

## Fase 7 — Sesi Kasir & Kas `[SELESAI]`

- [x] ✅ T-043 — Migration `cashier_sessions` (kolom terpisah per metode: cash/topup/receivable_cash/receivable_noncash)
- [x] ✅ T-044 — Migration `cash_accounts` + `cash_categories` + `cash_transactions` (+ retrofit FK `cash_account_id`/`cashier_session_id` di `deposit_transactions`/`debt_payments`/`consignment_settlements` dari Fase 4/6)
- [x] ✅ 🔑 [T-045](T-045-cashiersessionservice.md) — `CashierSessionService` (open/getActive/calculateExpected/close/forceClose/handover, addSaleCash dkk untuk fase mendatang) + `CashService` (recordIn/recordOut/transfer/dropCash/depositToBank)
- [x] ✅ T-046 — Halaman Sesi Kasir (buka/tutup + rincian + selisih real-time + PIN supervisor) dan Kas (Buku Kas/Masuk/Keluar/Transfer)
- [x] ✅ T-047 — Command `session:auto-close`, terjadwal harian 23:59

**Blocking:** Fase 4 & Fase 6 selesai.

## Fase 8 — Layar Kasir (POS)

- [ ] ⬜ T-048 — Migration `sales` + `sale_items` + `sale_holds`
- [ ] ⬜ T-049 — Layar kasir React: tata letak + hotkey F1–F12 (`react-hotkeys-hook`)
- [ ] ⬜ T-050 — Identifikasi anggota: scan kartu / input manual / cari nama (3 jalur)
- [ ] ⬜ 🔑 [T-051](T-051-saleservice-complete.md) — `SaleService::complete()` — orkestrasi stok FEFO + saldo + jurnal + kas sesi
- [ ] ⬜ T-052 — Hold/recall transaksi (`SaleHold`, `max_hold_per_cashier`)
- [ ] ⬜ T-053 — Cetak struk thermal 58mm & 80mm (dompdf)
- [ ] ⬜ T-054 — `CashierSessionService::addSaleCash()` terisi dari `SaleService`

**Blocking:** Fase 7 selesai.

## Fase 9 — Pembayaran Multi-Metode

- [ ] ⬜ T-055 — Migration `payments` + `receivables` (metode Kredit, `receivable_limit`)
- [ ] ⬜ 🔑 [T-056](T-056-paymentservice-credit-split.md) — `PaymentService::canUseCredit()` + split payment (voucher→poin→saldo→tunai)
- [ ] ⬜ T-057 — Integrasi QRIS + MDR (merchant discount rate)
- [ ] ⬜ T-058 — Modal pembayaran PIN deposit di layar kasir
- [ ] ⬜ T-059 — Potong gaji sederhana (fasilitator/staf)
- [ ] ⬜ T-060 — Halaman pelunasan piutang (`receivable.delete` eksklusif owner, >90 hari)

**Blocking:** Fase 8 selesai.

## Fase 10 — Diskon & Promo

- [ ] ⬜ T-061 — Migration `promos` (`is_public`, `days_of_week` ISO) + `coupons` + `coupon_redemptions`
- [ ] ⬜ T-062 — Migration `member_points` (poin reward)
- [ ] ⬜ T-063 — `PromoEngine`: prioritas 3 tahap, floor di HPP, `warnings[]`
- [ ] ⬜ T-064 — `VoucherService` (redeem, revert saat void)
- [ ] ⬜ T-065 — Bonus ulang tahun terintegrasi voucher (lanjutan T-029)
- [ ] ⬜ T-066 — `PointService` (akrual, redeem, expiry 12 bulan)
- [ ] ⬜ T-067 — Halaman kelola promo/voucher/poin

**Blocking:** Fase 9 selesai.

## Fase 11 — Retur, Void & Koreksi

- [ ] ⬜ T-068 — Migration `sale_returns` + tukar barang (exchange)
- [ ] ⬜ T-069 — `SaleReturnService::calculateRefundOptions()` (cek sesi asal — ADR-0007)
- [ ] ⬜ T-070 — `VoidService` (pembalikan penuh: stok, saldo, kupon, poin, jurnal)
- [ ] ⬜ T-071 — `revertCoupon()` (status kupon kembali `active` saat void)
- [ ] ⬜ T-072 — Halaman retur/void/tukar barang + PIN supervisor

**Blocking:** Fase 10 selesai.

## Fase 12 — Stock Opname, Transfer & Penyesuaian

- [ ] ⬜ T-073 — Migration `stock_opnames` + `stock_opname_items` + `stock_transfers`
- [ ] ⬜ T-074 — `OpnameService` (blind count, freeze `system_qty` saat `counting`)
- [ ] ⬜ T-075 — `TransferService` (dua tahap: kirim → terima)
- [ ] ⬜ T-076 — Evaluasi & hapus `stocks.reserved_qty` bila tidak terpakai (tindak lanjut ADR-0004)
- [ ] ⬜ T-077 — Halaman opname (alur persetujuan) & transfer stok

**Blocking:** Fase 11 selesai.

## Fase 13 — Akuntansi: COA, Jurnal & Buku Besar

- [ ] ⬜ T-078 — Migration `chart_of_accounts` + `journal_entries` + `journal_lines`
- [ ] ⬜ T-079 — Seeder COA wajib (termasuk akun 2-1200 Utang Deposit Anggota)
- [ ] ⬜ 🔑 [T-080](T-080-journalservice.md) — `JournalService` (validasi debit=kredit, exception bila timpang)
- [ ] ⬜ T-081 — Observer otomatis: Sale, Purchase, DepositTransaction, CashTransaction
- [ ] ⬜ T-082 — Peta jurnal konsinyasi murni (ADR-0006: pendapatan komisi, bukan penjualan penuh)
- [ ] ⬜ T-083 — Halaman buku besar & jurnal umum

**Blocking:** Fase 12 selesai.

## Fase 14 — Laporan

- [ ] ⬜ T-084 — `BaseReport` (arsitektur reuse dengan dashboard Fase 15)
- [ ] ⬜ T-085 — Laporan penjualan (per kasir, per produk, per metode bayar)
- [ ] ⬜ T-086 — Laporan stok (kartu stok, stok kritis, kadaluwarsa)
- [ ] ⬜ T-087 — Laporan keuangan (L/R, neraca, arus kas)
- [ ] ⬜ T-088 — Laporan piutang/hutang (aging 0–30/31–60/61–90/>90 hari)
- [ ] ⬜ T-089 — Ekspor Excel via antrian cron (>5000 baris, shared hosting)
- [ ] ⬜ T-090 — Akses laporan berdasarkan role (cashier: sesi sendiri saja, dst)

**Blocking:** Fase 13 selesai.

## Fase 15 — Dashboard & Analitik

- [ ] ⬜ T-091 — Dashboard Owner/Admin (stat card, tren 30 hari, panel perhatian)
- [ ] ⬜ T-092 — Dashboard Kasir (ringkasan sesi berjalan)
- [ ] ⬜ T-093 — Chart recharts dark-mode aware (`axisColor` dari theme token)
- [ ] ⬜ T-094 — Notifikasi dalam aplikasi (stok kritis, hutang jatuh tempo, dll)

**Blocking:** Fase 14 selesai (reuse query `BaseReport`).

## Fase 16 — Portal Wali & Notifikasi

- [ ] ⬜ T-095 — Migration `guardians` + `topup_requests` (`payment_provider` manual — ADR-0010)
- [ ] ⬜ T-096 — Login wali (HP + password, rate limit 5x/menit)
- [ ] ⬜ T-097 — `WaliLayout`: lihat saldo & riwayat anak, ajukan top-up (upload bukti)
- [ ] ⬜ T-098 — Verifikasi top-up oleh admin/treasurer (tanpa sesi kasir aktif)
- [ ] ⬜ T-099 — `NullGateway` notifikasi WhatsApp (log only, Fonnte/Wablas menyusul)
- [ ] ⬜ T-100 — Command reminder wali (piutang jatuh tempo, saldo rendah)

**Blocking:** Fase 4 selesai (independen dari Fase 5–15, bisa paralel).

## Fase 17 — Pengaturan Sistem

- [ ] ⬜ T-101 — `spatie/laravel-backup` nyata: mysqldump + gzip + upload Backblaze B2
- [ ] ⬜ T-102 — Cron backup harian 02:00 + notifikasi gagal + tombol uji restore
- [ ] ⬜ T-103 — Halaman pengaturan bertab (`config/pos.php` — rounding, threshold, dst)
- [ ] ⬜ T-104 — Konfirmasi bahaya ketat (reset data: ketik nama toko + password owner)

**Blocking:** Fase 13 selesai.

## Fase 18 — Pengujian, Keamanan & Penyiapan

- [ ] ⬜ T-105 — Test suite Pest: aturan bisnis kritis (revert kupon, konsinyasi no-jurnal, retur non-tunai, `receivable_limit`, floor HPP, ISO days_of_week)
- [ ] ⬜ T-106 — Hardening keamanan (CSP, rate limit, 2FA Fortify, audit log)
- [ ] ⬜ T-107 — Optimasi query + index MySQL (lihat `CATATAN-PERBAIKAN.md` § Field Indexing)
- [ ] ⬜ T-108 — Uji beban k6/wrk (30 concurrent user, target <800ms p95 — ADR-0008)
- [ ] ⬜ T-109 — Deploy Hostinger (langkah shared hosting, cron scheduler)
- [ ] ⬜ T-110 — Seeder demo lengkap untuk onboarding tim non-teknis

**Blocking:** Fase 17 selesai (semua fase bisnis selesai).

## Fase 19 — Storefront Publik *(baru)*

- [ ] ⬜ T-111 — `ProductPublicData` DTO (saring HPP/margin/stok — ADR-0009)
- [ ] ⬜ T-112 — Halaman katalog publik + detail produk
- [ ] ⬜ T-113 — Halaman promo publik (`promos.is_public`)
- [ ] ⬜ T-114 — Cek saldo publik (input nomor kartu, tanpa login)
- [ ] ⬜ T-115 — Caching agresif (`cache_ttl_minutes`) + SEO dasar

**Blocking:** Fase 2 & Fase 10 selesai (independen dari Fase 3–9, 11–18).

## Fase UI-01 — Fondasi UI *(baru)*

- [ ] ⬜ T-116 — Konsolidasi 45 halaman → 16 menu (`config/navigation.php` permission-aware)
- [ ] ⬜ T-117 — Scroll layout fixes + reusable tab component
- [ ] ⬜ T-118 — Review konsistensi dark mode CSS token (lanjutan Fase 0)
- [ ] ⬜ T-119 — Admin header + breadcrumb terintegrasi navigasi baru

**Blocking:** Fase 8 selesai (butuh cukup banyak halaman admin untuk konsolidasi menu).

---

## 10 Tiket Jalur Kritis (Critical Path)

Bila salah satu dari 10 ini macet > 2 hari, prioritaskan menyelesaikannya
lebih dulu sebelum lanjut ke tiket lain — semuanya memblokir banyak tiket
di belakangnya.

1. [T-001](T-001-instalasi-laravel-inertia-react.md) — Instalasi Laravel 12 + Inertia + React ✅ **selesai**
2. [T-006](T-006-migration-users-spatie-permission.md) — Migration users + spatie permission (blok semua auth)
3. [T-012](T-012-migration-products.md) — Migration products & barcodes (blok kasir, storefront, katalog)
4. [T-031](T-031-migration-stock-layers.md) — Tabel `stock_layers` (blok stok, penjualan, pembelian)
5. [T-032](T-032-stockservice-fefo-consume.md) — FEFO consume di `StockService` (blok penjualan)
6. [T-026](T-026-depositservice-lockforupdate.md) — `DepositService` dengan `lockForUpdate()` (blok top-up & pembayaran deposit)
7. [T-045](T-045-cashiersessionservice.md) — `CashierSessionService` (blok layar kasir)
8. [T-051](T-051-saleservice-complete.md) — `SaleService::complete()` (jantung kasir)
9. [T-056](T-056-paymentservice-credit-split.md) — `PaymentService` (blok pembayaran non-tunai/kredit)
10. [T-080](T-080-journalservice.md) — `JournalService` (blok semua akuntansi)

---

*Backlog ini tumbuh selama proyek berjalan. Tiket baru wajib ikuti format
7-bagian, pakai istilah dari `docs/CONTEXT.md`, dan rujuk ADR/SPEC.md yang
relevan.*
