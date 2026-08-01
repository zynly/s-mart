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

## Fase 8 — Layar Kasir (POS) `[SELESAI]`

- [x] ✅ T-048 — Migration `sales` + `sale_items` + `sale_holds`
- [x] ✅ T-049 — Layar kasir React: tata letak + hotkey (F3 scan, F4 hold, F5 recall, F9 bayar, Esc tutup dialog — set F1–F12 penuh menyusul UI-01)
- [x] ✅ T-050 — Identifikasi anggota: scan kartu / input manual / cari nama (via `CardService::resolve()` + fallback LIKE search)
- [x] ✅ 🔑 [T-051](T-051-saleservice-complete.md) — `SaleService::complete()` — orkestrasi stok FEFO + saldo + kas sesi (cash & deposit; metode lain menyusul Fase 9 sesuai cakupan tiket; jurnal otomatis menyusul Observer Fase 13)
- [x] ✅ T-052 — Hold/recall transaksi (`SaleHold`, `max_hold_per_cashier`)
- [x] ✅ T-053 — Cetak struk thermal (dompdf, lebar dari `config('pos.receipt_width')`)
- [x] ✅ T-054 — `CashierSessionService::addSaleCash()`/`addSaleDeposit()` terisi dari `SaleService`

**Blocking:** Fase 7 selesai.

## Fase 9 — Pembayaran Multi-Metode `[SELESAI]`

- [x] ✅ T-055 — Migration `sale_payments` + `receivables` + `receivable_payments` + `payroll_deductions` (metode Kredit, `receivable_limit`)
- [x] ✅ 🔑 [T-056](T-056-paymentservice-credit-split.md) — `PaymentService::canUseCredit()` + split payment (pola `PaymentHandler` per metode: cash/deposit/card/qris/ewallet/transfer/voucher/point/credit/payroll)
- [x] ✅ T-057 — Integrasi kartu/QRIS/e-wallet + MDR (merchant discount rate, `mdr_percent` per metode, wajib `reference_no`)
- [x] ✅ T-058 — Modal pembayaran PIN deposit di layar kasir (bebas PIN di bawah `no_pin_threshold`, wajib PIN + buat-PIN-dulu di atasnya)
- [x] ✅ T-059 — Potong gaji sederhana (fasilitator/staf — `PayrollDeduction` status `pending`, ditolak untuk santri)
- [x] ✅ T-060 — Halaman Piutang Anggota: daftar + aging + bayar cicil + `receivable.delete` eksklusif owner (>90 hari, ADR-0005)

**Blocking:** Fase 8 selesai.

## Fase 10 — Diskon & Promo `[SELESAI]`

- [x] ✅ T-061 — Migration `promos` (`is_public`, `days_of_week` ISO) + `promo_products`/`promo_categories`/`promo_member_levels` + `coupons` + `coupon_redemptions`
- [x] ✅ T-062 — Migration `point_transactions` (ledger poin reward, mengikuti pola `deposit_transactions`)
- [x] ✅ T-063 — `PromoEngine`: prioritas 3 tahap (item pilih-satu → item tambahan stackable → bill member-level), floor di HPP (estimasi `stocks.avg_cost`), `warnings[]`
- [x] ✅ T-064 — `VoucherService` (validate + redeem; revert saat void tetap tanggung jawab Fase 11 sesuai CATATAN-PERBAIKAN.md)
- [x] ✅ T-065 — Bonus ulang tahun terintegrasi kupon (lanjutan T-029, `pos.birthday_bonus_mode` = deposit|coupon)
- [x] ✅ T-066 — `PointService` (akrual proporsional `point_multiplier` level, redeem, expiry 12 bulan via `point:expire`, void membalikkan poin earn)
- [x] ✅ T-067 — Halaman Promo (CRUD + tipe-conditional form), Kupon (buat/generate massal + batalkan), Poin (mutasi per anggota). Simulator diskon & Laporan Efektivitas Promo di-skip (di luar cakupan jalur kritis fase ini — bisa disusulkan di Fase UI-01/Fase 16 laporan).

**Blocking:** Fase 9 selesai.

## Fase 11 — Retur, Void & Koreksi `[SELESAI]`

- [x] ✅ T-068 — Migration `sale_returns` + `sale_return_items` + `sale_return_refunds` (di luar spec asli, wajib — tanpa ini tidak ada cara membatasi retur-kedua atau menyimpan status refund non-tunai yang pending) + `exchanges` + `stock_write_offs` + `stock_layer_consumptions.qty_returned` (kolom baru, wajib untuk retur SEBAGIAN — `is_returned` saja tidak cukup mencegah retur stok dobel) + `receivables.status` tambah enum `cancelled`
- [x] ✅ T-069 — `SaleReturnService`: `getReturnableItems()`, `assertReturnable()` (status `completed` + dalam `pos.return_max_days`), `calculateRefundOptions()` (ADR-0007 — cash hanya ditawarkan bila sesi asal masih `open`, kalau sudah `closed` dialihkan ke deposit/transfer), `createAndProcess()` (alokasi FEFO ke layer asal, retur rusak → write-off otomatis dalam transaksi yang sama, refund proporsional largest-remainder). `PaymentService::refundPartial()` baru menangani refund per metode (cash lewat `CashierSessionService::addRefundCash()`, non-tunai lain tidak menyentuh counter sesi manapun — hanya sesi asal yang pernah mencatat penjualan itu secara sah)
- [x] ✅ T-070 — `VoidService` diekstrak dari `SaleService::void()` (pola sama seperti `PaymentService::canUseCredit()` → `CreditHandler`; `SaleService::void()` sekarang delegasi 1 baris) — pembalikan stok, refund per metode asal, poin, kupon (T-071), dan piutang (`ReceivableService::cancelFromVoid()`, status `cancelled` bukan `paid` supaya laporan tidak menyesatkan). **Jurnal pembalik ditunda ke Fase 13** — modul akuntansi belum ada; semua data yang dibutuhkan (total, total_cost, refund per metode) sudah tersimpan di `sale_returns`/`sale_return_refunds`/`sales` sehingga Fase 13 bisa membangun jurnal void/retur/write-off tanpa migrasi ulang.
- [x] ✅ T-071 — `VoucherService::revertCoupon()` — `used_count` dikembalikan, status kupon balik ke `active` HANYA dari `used` (bukan dari `cancelled` — deviasi sengaja dari contoh kode di CATATAN-PERBAIKAN.md: kupon yang sengaja dibatalkan admin tidak boleh hidup lagi walau nota yang memakainya di-void)
- [x] ✅ T-072 — `Admin/SaleReturns/Create.tsx` (cari nota → tabel item qty/kondisi/restock → preview refund live dengan catatan ADR-0007 → `SupervisorPinDialog` → submit ber-idempotency-key), `Admin/SaleReturns/Index.tsx`, blok void ditambahkan ke `Admin/CashierSession/Index.tsx` yang sudah ada (bukan halaman baru — tabel nota sesi aktif + tombol Void), `Admin/WriteOffs/Index.tsx` (ajukan/setujui/proses/tolak). Tukar barang (exchange) diekspos lewat `ExchangeService`/`pos.exchanges.store` tanpa layar 2-panel khusus (item pengganti diproses sebagai `SaleService::complete()` biasa) — UI dua-panel penuh ditunda ke Fase UI-01.

**Bug nyata ditemukan & diperbaiki (bukan cuma fitur baru):**
- `SaleController::void()`: rute `PUT /pos/sales/{sale}/void` di-gate `can:sale.void`, izin yang TIDAK PERNAH dimiliki kasir manapun (hanya owner/admin/supervisor) — membuat fitur void secara arsitektural tidak bisa dicapai lewat alur PIN-override kasir yang dimaksud sejak awal. Diperbaiki: middleware rute diganti `can:sale.view` (izin yang kasir punya), `VoidSaleRequest` mewajibkan `approver_id` eksplisit, dan `VoidService::void()` sendiri yang memvalidasi `approver_id` benar-benar punya `sale.void` (defense-in-depth, pola sama seperti `CashierSessionController::close()`/`CashierSessionService::close()` yang sudah ada sejak Fase 7).
- **`HandleInertiaRequests::share()` tidak pernah mengekspos `approverId`** — `AuthorizationOverrideController` men-flash `approverId` ke session via `->with()`, tapi middleware share tidak pernah membacanya ke props. Akibatnya `SupervisorPinDialog`'s `onApproved(page.props.approverId)` SELALU menerima `undefined` di SETIAP alur PIN supervisor di seluruh aplikasi (tutup sesi dengan selisih kas, ubah harga, diskon di atas batas — bukan cuma fitur baru Fase 11), bug lama yang lolos karena verifikasi sebelumnya selalu lewat tinker (memanggil service langsung, melewati layer flash-session Inertia). Ditemukan HANYA lewat verifikasi Playwright browser sungguhan (klik PIN dialog asli) — persis kelas bug yang tidak akan pernah ketahuan dari tinker atau unit test service. Diperbaiki: `HandleInertiaRequests::share()` menambahkan `'approverId' => fn () => $request->session()->get('approverId')`.
- `SaleReturns/Create.tsx`'s `refreshPreview()` memakai `fetch()` mentah (bukan `router.post` Inertia) untuk `POST /pos/returns/refund-preview`, awalnya mengambil CSRF token dari `<meta name="csrf-token">` yang TIDAK PERNAH ada di `app.blade.php` aplikasi ini (selalu 419). Diperbaiki: baca cookie `XSRF-TOKEN` langsung dan kirim sebagai header `X-XSRF-TOKEN` (pola yang dipakai axios/Inertia secara default, tidak otomatis untuk `fetch()` polos).

**Ditunda (didokumentasikan, pola sama seperti T-067):**
- Laporan Retur & Laporan Void → Fase 16 (read-model murni, tidak ada yang terblokir).
- Layar Tukar Barang 2-panel penuh → Fase UI-01.
- PDF nota retur → belum dibuat, bisa disusulkan kapan saja (kloning `receipt.blade.php`).

**Verifikasi:** tinker penuh per service (StockService partial-return guard, VoidService dengan kupon+poin+kredit+deposit split, SaleReturnService dengan ADR-0007 sesi tertutup, WriteOffService retur rusak net-stock-zero, ExchangeService kedua arah `price_difference`) + `pint --test`/`tsc --noEmit`/`eslint`/`build` bersih + **verifikasi Playwright browser sungguhan** (login kasir → void nota via PIN supervisor dengan `voided_by` = approver bukan kasir → retur atas nota dengan sesi asal tertutup, cash hilang dari opsi dengan catatan ADR-0007 tampil → submit dengan PIN → redirect ke daftar retur) yang menemukan 2 bug nyata di atas.

**Blocking:** Fase 10 selesai.

## Fase 12 — Stock Opname, Transfer & Penyesuaian `[SELESAI]`

- [x] ✅ T-073 — Migration `stock_opnames` + `stock_opname_items` + `stock_transfers` + `stock_transfer_items` + `stock_adjustments`/`stock_adjustment_items` (di luar judul ringkas tiket tapi ADA di spec detail §TABEL/SERVICE/HALAMAN — pola sama seperti Fase 11 menambah tabel di luar judul tiket). `stock_opname_movements` di spec **sengaja tidak dibuat** — `stock_movements` yang sudah ada sejak Fase 5 (immutable, ditulis oleh SEMUA service pemutasi stok) sudah cukup untuk menghitung "pergerakan sejak cutoff" tanpa tabel bayangan baru (lihat T-074).
- [x] ✅ T-074 — `OpnameService`: `start()` (freeze `system_qty` dari `stocks.qty`, blind — draft dilebur ke counting, 1 aksi bukan 2), `recordCount()`, `finishCounting()` (hitung `variance_qty`/`variance_value` per item + `variance_percent` header berbasis nilai), `approve()` (wajib `variance_reason` utk item di luar toleransi; selisih header di atas `config('pos.opname_tolerance_percent')` **wajib owner** via permission baru `opname.approve_variance`), `post()` (BARU DI SINI stok berubah — `postingQty = physical_qty - (system_qty + net_pergerakan_sejak_cutoff)`, BUKAN `physical_qty - system_qty` mentah, supaya transaksi sah yang terjadi selama counting tidak ikut terbalik/dobel-hitung; shortage → `StockService::consume()` FEFO, surplus → `addLayer()`), `cancel()`. Diverifikasi tinker dengan skenario penjualan disimulasikan DI TENGAH counting — hasil posting benar-benar mengecualikan penjualan yang sah itu.
- [x] ✅ T-075 — `TransferService`: `create()` → `approve()` → `send()` (FEFO consume di outlet asal, granularitas per-`StockLayerConsumption` supaya batch berbeda unit_cost/expired_at tidak diblender) → `receive()` (layer baru di outlet tujuan PER consumption dengan unit_cost/batch_no/expired_at identik dengan sumbernya; qty diterima < dikirim → status `partial` + `WriteOffService::createFromTransferShortfall()` otomatis di outlet asal, `type=lost`, TANPA mutasi stok tambahan karena stok sudah "keluar" penuh saat kirim) → `cancel()`.
- [x] ✅ T-076 — `stocks.reserved_qty` **dihapus** (migration `DROP COLUMN`). Dikonfirmasi lewat grep: tidak dipakai satu pun service sejak Fase 5 sampai Fase 11, dan desain transfer Fase 12 ini tidak membutuhkannya (stok outlet asal berkurang langsung saat kirim, tidak perlu pool "reserved" terpisah untuk merepresentasikan barang in-transit).
- [x] ✅ T-077 — `Admin/Opnames/Index.tsx` (mulai opname: outlet + scope all/kategori/brand/produk — **`location` dibuang dari scope**, tidak ada kolom lokasi/rak di skema produk manapun) + `Admin/Opnames/Show.tsx` (wizard 1 halaman reaktif ke status: counting dengan progress bar + scan barcode + tabel qty fisik blind, review dengan tabel selisih merah/hijau + kolom alasan, approve/posting). `Admin/Transfers/Index.tsx` dan `Admin/StockAdjustments/Index.tsx` (pola list+approve identik `WriteOffs/Index.tsx` Fase 11). **Tidak ada `SupervisorPinDialog` di fase ini** — beda dari void/retur (dipicu kasir yang butuh PIN-relay), aksi opname/transfer/adjustment dipicu dari panel admin/gudang oleh aktor yang sudah login sendiri (pola `WriteOffController::approve()`, cukup gate `can:modul.approve` di middleware rute).

**Bug nyata ditemukan & diperbaiki (ditemukan lewat pengujian multi-outlet — fitur pertama di aplikasi ini yang benar-benar menyentuh 2 outlet sekaligus):**
- `ReferenceGenerator`: counter referensi (`SO-`/`TF-`/`STK-`/dst) di-scope PER OUTLET PER HARI, padahal kolom `reference` di setiap tabel (termasuk `stock_movements` yang sudah ada sejak Fase 5) UNIK SECARA GLOBAL — begitu 2 outlet aktif menghasilkan prefix yang sama di hari yang sama, keduanya bisa menghasilkan string reference IDENTIK dan gagal insert (`UniqueConstraintViolationException`). Tidak pernah ketahuan sepanjang Fase 0-11 karena aplikasi selalu hanya punya 1 outlet. Diperbaiki: counter dijadikan global per prefix+tanggal (sentinel `outlet_id=0`, pola yang sudah dipakai `generateMemberNumber()` di file yang sama) — tidak ada perubahan perilaku untuk skenario 1-outlet yang sudah ada.
- `OpnameController::count()` awalnya dipanggil dari frontend lewat `router.post()` (Inertia) padahal endpoint-nya mengembalikan `response()->json()` polos — Inertia menolak response non-Inertia dengan modal error yang memblokir seluruh halaman. Diperbaiki: frontend pakai `fetch()` + header `X-XSRF-TOKEN` (pola yang sama seperti perbaikan serupa di Fase 11), diikuti `router.reload({only:['opname']})` supaya progress counting tetap sinkron tanpa reload penuh.

**Ditunda (didokumentasikan, pola sama seperti fase-fase sebelumnya):**
- Cetak lembar hitung manual (PDF) & berita acara opname → infrastruktur PDF di luar nota belum ada, bisa disusulkan kapan saja.
- Laporan Opname (riwayat, tren selisih, produk sering selisih) → Fase 16 (read-model murni).
- Layar scan barcode khusus di outlet tujuan untuk `receive()` → form input manual per baris cukup untuk cakupan fase ini.

**Verifikasi:** tinker penuh per service (termasuk skenario penjualan disimulasikan di tengah counting untuk membuktikan `post()` tidak dobel-hitung, dan guard "satu opname aktif per outlet") + `pint --test`/`tsc --noEmit`/`eslint`/`build` bersih + **verifikasi Playwright browser sungguhan** dengan 2 outlet asli (bukan cuma baca kode) — alur opname penuh start→count→review→approve(ditolak untuk non-owner, diterima untuk owner)→posted, dan alur transfer penuh create→approve→send→receive lintas outlet, keduanya dikonfirmasi lewat state database aktual, console browser bersih tanpa error.

**Blocking:** Fase 11 selesai.

## Fase 13 — Akuntansi: COA, Jurnal & Buku Besar `[SELESAI]`

- [x] ✅ T-078 — Migration `accounts` + `journals` + `journal_entries` + `accounting_periods` (nama tabel literal spec detail dipakai, bukan judul ringkas tiket "chart_of_accounts"/"journal_lines" — pola sama seperti Fase 11/12: judul tiket kadang tidak presisi, spec detail dengan kolom lengkap yang jadi acuan).
- [x] ✅ T-079 — `AccountSeeder`: seluruh COA literal spec (1-0000 s/d 6-2000, termasuk 2-1200 Utang Deposit Anggota) + **7 akun tambahan di luar daftar literal spec, ditemukan/dibutuhkan saat implementasi**: `1-1450` Piutang Karyawan (Payroll — metode bayar potong gaji butuh akun sendiri, bukan Piutang Usaha/Anggota), `4-1300` Pendapatan Komisi Konsinyasi (wajib untuk peta jurnal konsinyasi terkoreksi, T-082), `6-1600` Beban Penyesuaian Saldo (`DepositService::adjust()` tidak dipetakan spec sama sekali), `4-2300` Pendapatan Operasional Lainnya, `6-1700` Beban Gaji/Honor, `6-1800` Beban Operasional Lainnya, `6-1900` Beban Lain-lain (empat terakhir ditemukan karena akun "induk"-nya di spec — `4-2000 Pendapatan Lain-lain` & `6-1000 Beban Operasional` — ternyata akun HEADER berkat anak-akunnya sendiri, jadi tidak bisa diposting langsung; kas masuk/keluar manual dan penyesuaian butuh leaf sendiri). `level`/`parent_id` dihitung otomatis dari kode berjenjang saat seed.
- [x] ✅ 🔑 [T-080](T-080-journalservice.md) — `JournalService` penuh: `record()` (otomatis, langsung `posted`, validasi debit=kredit + tolak akun header + tolak periode closed), `createManual()`/`post()` (manual, `draft`→`posted`), `reverse()` (generik, tukar debit/kredit semua baris, dipakai Void — TIDAK ada logika reversal khusus per tipe transaksi), `getLedger()`/`getTrialBalance()`/`getProfitLoss()`/`getBalanceSheet()`/`closePeriod()`/`reopenPeriod()`, plus 2 helper publik dipakai ulang semua observer: `resolveCashAccountCode()` (peta `CashAccount.type`+`is_drawer` → akun GL) & `resolvePaymentMethodAccountCode()` (peta `payment_methods.type` → akun GL). `getProfitLoss()` pakai **konvensi tanda seragam per TIPE akun** (`revenue`=kredit−debit, `expense`=debit−kredit) supaya akun kontra (Retur/Diskon Penjualan, `normal_balance=debit` tapi `type=revenue`) otomatis MENGURANGI total, bukan dobel-hitung. `getBalanceSheet()` menambah baris semu "Laba Berjalan (belum ditutup)" (P&L sejak periode terakhir ditutup) supaya Aset=Kewajiban+Ekuitas tetap seimbang di neraca interim, bukan cuma tepat sesudah `closePeriod()` — dikonfirmasi lewat browser sungguhan (lihat Verifikasi).
- [x] ✅ T-081 — **14 Observer otomatis** terdaftar di `AppServiceProvider::boot()` (diperluas jauh dari 4 model minimal di judul tiket — mengikuti peta jurnal lengkap semua jenis transaksi di spec detail + koreksi CATATAN-PERBAIKAN.md): `SaleObserver` (paling kompleks, split baris reguler/konsinyasi per item — lihat T-082), `SaleReturnObserver`, `PurchaseObserver`, `PurchaseReturnObserver`, `DebtPaymentObserver`, `DepositTransactionObserver` (filter per `type`; `purchase`/`refund`/`card_transfer_*`/`expired` SENGAJA di-skip — sudah tercakup jurnal Sale/SaleReturn atau net-nol), `ReceivablePaymentObserver`, `ReceivableObserver` (hanya transisi `written_off`; `cancelled` SENGAJA di-skip — sudah tercakup reversing journal Void), `CashTransactionObserver` (hanya yang `sourceable_type IS NULL` — kas masuk/keluar/transfer MANUAL; yang punya `sourceable` sudah dijurnal observer pemiliknya sendiri, cegah dobel-hitung), `CashierSessionObserver` (selisih kas saat tutup sesi), `ConsignmentSettlementObserver`, `StockWriteOffObserver` (skip barang konsinyasi via `stock_layers.is_consignment`), `StockOpnameObserver` (kurang+lebih bisa campur dalam 1 dokumen, dihitung dari `stock_movements` aktual yang ditulis `post()`, BUKAN `variance_qty` mentah — post() menyesuaikan dengan pergerakan sejak cutoff), `StockAdjustmentObserver` (satu dokumen selalu seragam naik/turun). **Timing bug ditemukan & dipola-kan**: `SaleService::complete()`/`SaleReturnService::createAndProcess()`/`PurchaseService::receive()`/`PurchaseService::processReturn()` semua membuat header `Model::create()` DULU baru anak-anaknya (items/payments) SESUDAHNYA dalam transaksi yang sama — observer `created()` polos melihat keranjang kosong. `SaleObserver` diperbaiki dengan pola idempoten `created()`+`updated()` dual-hook (ditemukan lebih dulu, sudah teruji, sengaja TIDAK diretrofit ke pola di bawah untuk menghindari risiko ulang). Observer-observer SESUDAHNYA (`SaleReturnObserver`, `PurchaseObserver`, `PurchaseReturnObserver`) pakai pola lebih bersih: `Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit` (Laravel 11+, menunda SEMUA handler observer sampai transaksi benar-benar commit) + `created()` biasa.
- [x] ✅ T-082 — Peta jurnal konsinyasi **hasil koreksi CATATAN-PERBAIKAN.md**, BUKAN peta literal spec asli (spec asli salah: "D Kas/K Penjualan + D Beban Konsinyasi/K Utang Konsinyasi" — barang konsinyasi bukan aset sekolah, tidak ada "Penjualan" yang jadi milik sekolah). Peta benar: jual → `D Kas/K Utang Konsinyasi` (harga penuh) + `D Utang Konsinyasi/K Pendapatan Komisi Konsinyasi` (porsi komisi, TANPA baris HPP/Persediaan sama sekali); settlement → `D Utang Konsinyasi/K Kas`; retur konsinyasi → TIDAK ADA JURNAL. `sale_items` tidak punya flag `is_consignment` — diturunkan per baris lewat `stock_layer_consumptions` → `stock_layers.is_consignment`, dengan qty-weighted ratio karena FEFO bisa memecah satu baris jual ke lintas-layer campuran (jarang, tapi mungkin). Diverifikasi tinker skenario keranjang CAMPUR barang reguler+konsinyasi sekaligus — hasil jurnal split persis sesuai hitungan manual.
- [x] ✅ T-083 — 8 halaman sesuai spec: `Admin/Accounts/Index.tsx` (pohon COA berindentasi level + CRUD, akun `is_system` tidak bisa diubah kode/dihapus, akun ber-mutasi tidak bisa dihapus), `Admin/Journals/Index.tsx` (list+filter+form jurnal manual inline, **Validasi Jurnal digabung sebagai section di halaman ini** alih-alih halaman terpisah — cakupannya kecil), `Admin/Journals/Show.tsx` (detail+tombol Posting/Balik), `Admin/Ledger/Index.tsx`, `Admin/TrialBalance/Index.tsx`, `Admin/ProfitLoss/Index.tsx` (+ perbandingan periode lalu), `Admin/BalanceSheet/Index.tsx`, `Admin/AccountingPeriods/Index.tsx` (tutup/buka periode, permission khusus `period.close` yang SUDAH ada sejak `RolePermissionSeeder` awal — tidak perlu permission baru).

**Bug nyata ditemukan & diperbaiki (di luar cakupan T-078..T-083, ditemukan saat membaca ulang service lama untuk membangun peta jurnal):**
- `PurchaseService::processReturn()` — retur pembelian TUNAI tidak pernah menyentuh kas sama sekali meski `CashService` sudah ada sejak Fase 7 (komentar di kode sendiri mengakui ini "menyusul"). Diperbaiki: panggil `CashService::recordIn()` untuk kasus tunai.
- `ConsignmentService::markPaid()` — bug sejenis: pembayaran ke pemilik barang konsinyasi tidak pernah menyentuh kas meski `consignment_settlements.cash_account_id` sudah disiapkan sejak tabel ini dibuat. Diperbaiki: panggil `CashService::recordOut()`, simpan `cash_account_id` yang dipakai.
- `cash_categories.account_code` — kolom sudah ada sejak Fase 7 (komentar migration eksplisit "dipetakan saat Fase 13 dibangun") tapi belum pernah diisi. Dipetakan penuh di `MasterDataSeeder` (8 kategori bawaan → akun GL masing-masing).

**Dipertimbangkan tapi SENGAJA TIDAK diperbaiki (didokumentasikan, bukan luput):**
- `PurchaseService::receive()` sisi TUNAI punya bug simetris dengan retur (juga tidak pernah menyentuh `CashService`). BEDA dari sisi retur: `cash_accounts.current_balance` SELALU disemai 0 dan tidak pernah didanai otomatis, sedangkan `CashService::recordOut()` (beda dari `recordIn()`) bisa melempar `InsufficientCashBalanceException` bila saldo kurang — menyambungkannya akan memblokir alur pembelian tunai yang sudah berjalan sampai pemilik toko menyetor kas manual dulu lewat fitur Kas Masuk, perubahan perilaku operasional nyata yang di luar cakupan bug-fix yang disetujui untuk fase ini.
- `cash_accounts.current_balance` tetap TIDAK direkonsiliasi dengan GL baru (`journal_entries`) — dua ledger terpisah secara sengaja: GL adalah sumber kebenaran akuntansi, `current_balance` murni alat rekonsiliasi fisik laci/brankas (dipakai `CashierSessionService`). Menyatukan keduanya adalah proyek tersendiri berisiko tinggi menyentuh 4+ service yang sudah teruji di 12 fase sebelumnya.
- `sales.rounding`/`sales.tax` dikonfirmasi dormant (selalu 0, tidak pernah diset `SaleService::complete()`) — `SaleObserver` sudah punya baris jurnal pembulatan yang di-guard `if !== 0`, jadi kodenya SIAP begitu kolom itu mulai dipakai, tapi tidak butuh perubahan sekarang.

**Ditunda (pola sama seperti fase-fase sebelumnya):**
- Cetak PDF laporan keuangan → infrastruktur PDF di luar nota belum ada.
- Ekspor Excel & filter tanggal preset canggih di semua halaman laporan → arsitektur `BaseReport` Fase 14, supaya tidak dobel-bangun.

**Verifikasi:** tinker berlapis wajib per level (JournalService inti dulu — termasuk uji jurnal timpang ditolak, posting ke akun header ditolak, posting ke periode closed ditolak, `reverse()` neto nol — baru satu-per-satu 14 observer, tiap observer diverifikasi sebelum lanjut observer berikutnya, termasuk skenario sale campur reguler+konsinyasi dan `closePeriod()` dengan jurnal penutup+Laba Ditahan yang benar) + `pint --test`/`tsc --noEmit`/`eslint`/`build` bersih + **verifikasi Playwright browser sungguhan** penuh: proses 1 sale tunai lewat POS asli (scan barcode → bayar tunai) → jurnal otomatis muncul benar di Jurnal Umum/Buku Besar/Neraca Saldo/Laba Rugi/Neraca (Neraca seimbang lewat baris "Laba Berjalan" interim) → void nota lewat `CashierSession` UI dengan PIN supervisor sungguhan → jurnal pembalik terbentuk, Neraca Saldo kembali nol per akun → tutup periode Agustus 2026 lewat UI → 2 percobaan submit jurnal manual bertanggal di periode itu lewat UI keduanya DITOLAK backend (dikonfirmasi lewat DB, jumlah jurnal tetap tidak bertambah) — console browser bersih tanpa error di semua langkah.

**Blocking:** Fase 12 selesai.

## Fase 14 — Laporan `[SELESAI]`

- [x] ✅ T-084 — `app/Reports/BaseReport.php` (abstract: `key()`, `title()`,
      `category()`, `requiredPermission()`, `filters()`, `query()`,
      `columns()`, `summary()`, `scopeForCashier()`, + 2 helper `final`
      dipakai ulang semua laporan: `visibleColumns()` dan
      `visibleSummary()` — satu implementasi filter kolom/ringkasan
      cost-sensitif, bukan diduplikasi tiap laporan, lihat Temuan D).
      `app/Reports/ReportRegistry.php` — satu peta `key => class` dipakai
      ulang `ReportController` (halaman) dan `GenerateReportExportJob`
      (antrian) supaya tidak ada 2 salinan array yang bisa tidak sinkron.
      **`toPdf()` di interface spec sengaja didrop** — konsisten pola PDF
      di luar nota yang ditunda di semua fase lain (Temuan F).
- [x] ✅ T-085 — 4 laporan penjualan: `SalesSummaryReport` (rekap
      harian), `SalesByProductReport` (qty/omzet/HPP/margin),
      `SalesByCashierReport`, `SalesByPaymentMethodReport` (+beban MDR).
      Semua kategori `penjualan`, auto-scope ke kasir sendiri lewat
      `scopeForCashier()` (Temuan D).
- [x] ✅ T-086 — 3 laporan stok: `StockSummaryReport` (qty+nilai
      persediaan), `StockCardReport` (kartu stok per produk — filter
      `product_id` diperlakukan sebagai filter biasa bertipe `product`,
      bukan parameter route terpisah; kosong → query sengaja
      `whereRaw('1=0')`, frontend tampilkan pesan "pilih produk dulu"),
      `StockCriticalExpiryReport` (gabung stok kritis `qty<=min_stock`
      + kadaluwarsa `<=N hari` jadi SATU laporan lewat SQL `UNION ALL`
      dua SELECT dengan bentuk kolom sama — bukan digabung di PHP,
      supaya tetap satu result-set yang bisa dipaginasi `BaseReport`
      generik).
- [x] ✅ T-087 — `CashLedgerReport` (Buku Kas — mutasi `cash_transactions`
      semua akun kas, beda dari Buku Besar Fase 13 yang sumbernya
      `journal_entries`/akuntansi double-entry). **Laba Rugi & Neraca
      Fase 13 TIDAK dibangun ulang sebagai `BaseReport` generik** —
      keduanya sudah punya tata letak laporan keuangan terstruktur +
      perbandingan periode yang sudah teruji browser sungguhan;
      memaksanya ke bentuk kolom/baris generik adalah kemunduran
      presentasi tanpa manfaat. Cukup di-link dari Reports hub sebagai
      "Laporan Keuangan Lengkap" (Temuan B).
- [x] ✅ T-088 — `ReceivableAgingReport`/`DebtAgingReport` — wrapper
      tipis di atas aturan bucket yang SAMA PERSIS dengan
      `ReceivableService::getAging()`/`DebtService::getAging()` (Fase
      6/9) — method itu sendiri TIDAK dipanggil langsung karena
      mengembalikan `Collection` eager (peta+`diffInDays()` per baris),
      tidak cocok dipaginasi `BaseReport` yang butuh `Builder`. Aturan
      bucket (current/0-30/31-60/61-90/90+) diekspresikan ulang sebagai
      SQL `CASE WHEN DATEDIFF(...)` yang identik — bukan aturan baru
      (Temuan C).
- [x] ✅ T-089 — `app/Exports/ReportExport.php` (satu class generik
      `FromQuery`+`WithHeadings`+`WithMapping` dipakai SEMUA laporan,
      kolom persis `visibleColumns()` — user tanpa `product.view_cost`
      juga tidak dapat kolom HPP/margin di file Excel, bukan cuma
      disembunyikan di layar). Ambang **5000 baris** (dihitung lewat
      `paginate(1)->total()`, BUKAN `Builder::count()` polos — `count()`
      gagal untuk query ber-`groupBy` karena alias `SELECT` hilang di
      query count yang disederhanakan Laravel, bug nyata ditemukan saat
      tinker, `paginate()->total()` sudah menangani ini dengan benar):
      ≤5000 baris ditulis ke `storage/app/private/exports/` lalu
      dikembalikan **signed URL** (`URL::temporarySignedRoute`, 24 jam)
      langsung; >5000 baris `GenerateReportExportJob` (ShouldQueue) di
      antrian `database` (shared hosting tanpa Supervisor — cron
      `schedule:run` per menit yang memicu `queue:work --stop-when-
      empty`, BUKAN daemon terus-menerus, sesuai CATATAN-PERBAIKAN.md),
      selesai kirim `ReportExportReadyNotification` (channel
      `database`+`mail`, `mail` log-only lewat `MAIL_MAILER=log` di dev
      — SMTP sungguhan concern deploy Fase 18). **Route unduh dijaga
      Laravel signed-URL middleware `signed`** (menolak link ditempel/
      kedaluwarsa otomatis), BUKAN pengecekan kepemilikan notifikasi
      ad-hoc yang lebih rapuh — desain awal sempat lewat situ, diganti
      ke pola signed-URL standar Laravel sebelum selesai. Riwayat ekspor
      tampil sebagai panel "Ekspor Saya" di Reports hub (query
      `$user->notifications()`, tabel `notifications` SUDAH ada sejak
      Fase 0 + `User` sudah `Notifiable` — tidak perlu migration baru).
      **Bel notifikasi in-app global SENGAJA tidak dibangun di sini**
      — itu tiket Fase 15 (T-094), supaya tidak mendahului/duplikasi.
      Ekspor sinkron (≤5000 baris) TIDAK membuat baris notifikasi
      (didownload langsung lewat popup saat itu juga, tidak perlu
      "diberitahu" — panel "Ekspor Saya" jadi murni riwayat ekspor
      ANTRIAN, bukan riwayat semua ekspor; didokumentasikan di sini
      supaya jelas ini keputusan sadar, bukan bug).
- [x] ✅ T-090 — Akses per role BUKAN sekadar permission `report.view`
      (dipegang SEMUA role termasuk kasir) — tiap `BaseReport`
      mendeklarasikan `category()` + `requiredPermission()` modul yang
      benar-benar relevan (mis. `stock.view` utk laporan stok,
      `debt.view`/`receivable.view` utk aging). Role `cashier`
      (`hasRole('cashier')`, satu-satunya pengecekan nama-role eksplisit
      di seluruh fitur ini — sengaja, karena aturan spec memang per
      nama role literal "Kasir: hanya laporan sesinya sendiri") HANYA
      melihat kategori `penjualan` di Reports hub, TERLEPAS dari
      permission modul lain yang kebetulan dipegang untuk keperluan
      lain (kasir sudah lama punya `stock.view`/`cash.view` sejak
      fase-fase awal, bukan untuk laporan) — laporan penjualan itu
      sendiri di-scope `where('user_id', auth()->id())` lewat
      `scopeForCashier()`, pola sama persis
      `CashierSessionController::index()`. Kolom & baris ringkasan
      HPP/margin disembunyikan lewat `product.view_cost` (pola sudah
      ada sejak `ProductController`/`StockController`, dipakai ulang
      apa adanya) — **bug nyata ditemukan & diperbaiki saat verifikasi
      Playwright**: baris ringkasan (`summary()`) awalnya BOCOR
      menampilkan angka HPP/Laba Kotor ke kasir meski kolom tabelnya
      sendiri sudah benar disembunyikan (`visibleColumns()` sudah ada,
      tapi belum ada versi `summary()`-nya) — diperbaiki dengan
      `visibleSummary()` yang memfilter key ringkasan memakai sumber
      kebenaran yang SAMA (`hideWithoutCost` di `columns()`).

**Bug nyata ditemukan & diperbaiki (di luar cakupan tiket, ditemukan
saat verifikasi tinker/Playwright):**
- `Builder::count()` gagal untuk semua laporan ber-`groupBy` (4 laporan
  penjualan + `StockCriticalExpiryReport`) — dipakai buat memutuskan
  ambang ekspor sinkron/antrian (T-089). Diperbaiki: `paginate(1)->
  total()` (mekanisme yang sama sudah dipakai `show()`/paginasi
  laporan, sudah pasti benar untuk query ber-`groupBy`).
- Baris ringkasan bocor kolom cost-sensitif ke role tanpa
  `product.view_cost` (lihat T-090 di atas) — diperbaiki
  `visibleSummary()`.

**Ditunda (didokumentasikan, pola sama seperti fase-fase sebelumnya):**
- 32 laporan lengkap di spec (§Fase 14 bagian 2) — cakupan fase ini
  ikut 7 tiket INDEX.md (9 laporan `BaseReport` baru + Laba Rugi/Neraca
  Fase 13 di-link), bukan wishlist spec penuh. Arsitektur `BaseReport`
  yang dibangun trivially extensible untuk menambah sisanya kapan saja
  (Penjualan per Kategori, Produk Terlaris, Analisis Jam Ramai, Laporan
  Deposit, Laporan Anggota, Efektivitas Promo, Laporan Konsinyasi per
  Supplier, dst) tanpa perubahan arsitektur.
- Cetak PDF laporan (`toPdf()` di spec) → ditunda, pola sama semua PDF
  di luar nota di seluruh fase lain.
- Laporan Terjadwal (kirim otomatis ke email owner harian/mingguan/
  bulanan), Perbandingan Antar-Outlet, cetak kop surat sekolah (spec
  §4 Fitur Tambahan) → di luar 7 tiket INDEX.md, bisa disusulkan kapan
  saja di atas arsitektur `BaseReport` yang sudah ada.
- Bel notifikasi in-app global → tiket Fase 15 T-094, sengaja tidak
  didahului (lihat T-089 di atas).

**Verifikasi:** tinker penuh per laporan (query manual dicocokkan
angka mentah dari DB, termasuk skenario scope kasir pada
`SalesSummaryReport`/`SalesByProductReport`) + ekspor sinkron & antrian
(`dispatchSync`) + `pint --test`/`tsc --noEmit`/`eslint`/`build` bersih
+ **verifikasi Playwright browser sungguhan** lintas 4 role (owner/
treasurer/warehouse/kasir1) — kategori Reports hub persis sesuai role
(kasir1 HANYA lihat Penjualan, warehouse Penjualan+Stok, treasurer &
owner semua), laporan penjualan kasir1 ter-scope ke transaksi sendiri
saja (3 dari 4 total) dengan kolom HPP tersembunyi di tabel MAUPUN
ringkasan, `StockCriticalExpiryReport` (UNION query) dan `StockCardReport`
(filter produk + empty-state) tampil benar, `ReceivableAgingReport`/
`DebtAgingReport` bucket cocok (diuji dengan piutang/hutang sengaja
dimundurkan jatuh temponya ke 100/45 hari), ekspor Excel sinkron via
tombol UI (toast sukses + file terunduh via popup) dan ekspor antrian
via job (notifikasi database muncul di panel "Ekspor Saya", tautan
unduh signed-URL berhasil diklik dan file benar-benar terunduh) —
console browser bersih tanpa error di semua langkah.

**Blocking:** Fase 13 selesai.

## Fase 15 — Dashboard & Analitik `[SELESAI]`

Backlog resmi (bagian ini) hanya punya 2 tiket dashboard (Owner/Admin,
Kasir) — spec Livewire asli (`skillage-mart/prompts/fase-15.md`)
membayangkan **4 dashboard terpisah** per role (+ Gudang, Bendahara).
**Keputusan:** satu halaman dashboard dengan widget PERMISSION-GATED,
bukan 4 halaman/controller terpisah — kasir (`hasRole('cashier')`,
pola PERSIS sama dengan `ReportController::visibleTo()`/
`scopedQuery()` Fase 14) dapat widget sesi berjalan; role lain dapat
widget analitik yang masing-masing baru muncul kalau user punya
permission modul terkait (`stock.view` → panel stok, `debt.view` →
panel hutang, dst). Supervisor/warehouse/treasurer otomatis dapat
subset relevan lewat mekanisme ini tanpa perlu halaman/tiket
tambahan — sekaligus memenuhi semangat spec asli (Gudang lihat
stok, Bendahara lihat hutang/piutang/deposit) tanpa duplikasi kode.

- [x] ✅ T-091 — `app/Http/Controllers/Admin/DashboardController.php`
      (baru, menggantikan closure inline route lama) — cabang manager:
      stat card (Penjualan Hari Ini +tren vs kemarin, Laba Kotor Hari
      Ini [hanya jika `product.view_cost`], Jumlah Transaksi,
      Rata-rata per Transaksi), 4 chart (lihat T-093), panel perhatian
      (stok kritis/kadaluwarsa, hutang jatuh tempo ≤7 hari, piutang
      menunggak, saldo deposit beredar, ulang tahun anggota 7 hari,
      selisih rekonsiliasi belum selesai), transaksi terakhir (10),
      produk terlaris minggu ini, peringkat kasir. **Semua query REUSE
      langsung** dari `BaseReport` Fase 14 (`SalesSummaryReport`,
      `SalesByPaymentMethodReport`, `SalesByCashierReport`) via
      `scopedQuery()` — tidak ada logika agregasi penjualan yang
      ditulis dua kali. Bug nyata ditemukan &amp; diperbaiki saat verifikasi
      tinker lintas role: query panel stok kritis (`GROUP BY
      products.id` tanpa `SELECT` eksplisit, fallback ke `SELECT *`)
      gagal di MySQL `ONLY_FULL_GROUP_BY` — diperbaiki dengan
      `selectRaw('products.id')` eksplisit sebelum `groupBy()`,
      sama seperti pola `StockCriticalExpiryReport` yang sudah benar.
- [x] ✅ T-092 — Cabang kasir di controller yang sama: status sesi aktif
      via `CashierSessionService::getActive()` (modal awal, transaksi,
      durasi), penjualan &amp; transaksi milik sendiri hari ini, tombol
      besar Buka Kasir/Lanjut Kasir ke `/pos`, tombol cepat Sesi &amp;
      Kas/Top-Up/Cek Saldo/Retur.
- [x] ✅ T-093 — `resources/js/Lib/chartTheme.ts` (`useChartColors()`) —
      baca `.dark` di `<html>` (sumber kebenaran yang sudah diterapkan
      `applyTheme()` sejak Fase 0) + subscribe ke `useThemeStore.theme`
      supaya re-render saat `ThemeToggle` diklik. `axisColor` persis
      sesuai `CATATAN-PERBAIKAN.md` §Fase15 (`#94A3B8` gelap /
      `#2E5490` terang, dikonfirmasi lewat Playwright — baca atribut
      `stroke` SVG langsung, bukan cuma visual). Palet 6 warna diambil
      dari token proyek yang sudah ada (`navy-500`/`gold`/`teal`/
      `danger`/`warning`/`success` di `app.css`), bukan hex baru.
      4 chart recharts: tren 30 hari (`LineChart`, reuse
      `SalesSummaryReport`), kategori hari ini (`PieChart`), metode
      bayar hari ini (`BarChart`, reuse `SalesByPaymentMethodReport`),
      jam ramai hari ini (`BarChart`).
- [x] ✅ T-094 — `app/Notifications/AlertNotification.php` (satu class
      generik, bukan satu class per jenis alert — bentuknya sama:
      judul+pesan+tautan+kunci dedup) + `app/Console/Commands/
      GenerateAlertNotifications.php` (`notifications:generate-alerts`,
      dijadwalkan `dailyAt('23:15')` di `routes/console.php` — setelah
      `deposit:reconcile` yang jadi sumber data rekonsiliasi, mengikuti
      pola 5 command harian yang sudah ada sejak fase-fase awal).
      Idempotent lewat `dedupe_key` — skip kalau notifikasi UNREAD
      dengan key yang sama untuk user itu sudah ada, supaya tidak spam
      di tiap run harian selama kondisinya belum berubah/dibaca
      (diverifikasi: run kedua menghasilkan 0 notifikasi baru).
      **Dilingkupi ke 4 ambang batas eksplisit** (stok kritis/
      kadaluwarsa, hutang jatuh tempo ≤7 hari, piutang menunggak,
      selisih rekonsiliasi deposit `DepositReconciliation.is_resolved`
      — model ini sudah ada sejak Fase 4, dipakai APA ADANYA) —
      **notifikasi "PO/opname/top-up menunggu approval" SENGAJA
      di-skip**: kata "dll" di judul tiket asli bukan daftar wajib
      eksplisit, dan item approval-pending itu sudah terlihat lewat
      filter status di halaman masing-masing (bukan kondisi tersembunyi
      yang mendekat diam-diam seperti ambang batas — itu alasan asli
      kenapa notifikasi proaktif dibutuhkan). `NotificationController`
      (baru, endpoint JSON kecil `index`/`markAsRead`/`markAllAsRead`
      — bukan `Inertia::render`, karena ini panel dropdown bukan
      halaman) + `unreadNotificationsCount` ditambahkan ke shared props
      Inertia (`HandleInertiaRequests`) untuk badge. `NotificationBell.tsx`
      (baru) menggantikan ikon lonceng statis placeholder dari Fase
      UI-01 (T-119) — dropdown lazy-fetch (`fetch()`, pola yang sama
      dipakai `Opnames/Show.tsx`/`Pos/Index.tsx`, bukan `router.visit`
      penuh karena ini panel kecil bukan halaman), tandai dibaca per
      item &amp; tandai semua dibaca.

**Verifikasi:** tinker `DashboardController::index()` lintas 6 role
(owner/admin/supervisor/kasir1/warehouse/treasurer) — panel yang
tampil cocok persis dengan permission masing-masing role di
`RolePermissionSeeder` (mis. admin kehilangan panel rekonsiliasi
karena tidak punya `deposit.adjust`, warehouse hanya dapat panel
stok, treasurer dapat hutang/piutang/ulang-tahun tapi bukan deposit).
`notifications:generate-alerts` diuji jalan dua kali — run kedua 0
notifikasi baru (idempotent lewat `dedupe_key`) — plus
`deposit:reconcile` dijalankan lebih dulu untuk memastikan sumber
data rekonsiliasi ada. `pint --test`/`tsc --noEmit`/`eslint`/`build`
bersih (chunk `Dashboard` 417KB — wajar untuk recharts, tidak memicu
peringatan ukuran Vite, terisolasi ke satu halaman). Playwright lintas
6 role: kasir1 dapat widget sesi (bukan stat card/chart), role lain
dapat stat card+chart, dropdown notifikasi terbuka tanpa error di
semua role, warna axis chart dikonfirmasi persis via atribut SVG
`stroke` (`#2E5490` terang → `#94A3B8` gelap saat `ThemeToggle`
diklik), console browser bersih di semua langkah. DB direset ke seed
bersih (`migrate:fresh --seed`) setelah verifikasi.

**Blocking:** Fase 14 selesai (reuse query `BaseReport`).

## Fase 16 — Portal Wali & Notifikasi `[SELESAI]`

Spec asli (`skillage-mart/prompts/fase-16.md`) + ADR-0010 + CATATAN-
PERBAIKAN.md §Fase16 dibaca penuh dulu. Ditemukan `TopupRequest`
(model+migration) SUDAH ADA sejak sebelum fase ini (kemungkinan
disiapkan bareng Fase 4) tapi TIDAK PERNAH disambungkan ke controller/
route apa pun, dan belum punya `guardian_id`/`payment_provider`/
`payment_reference` yang diwajibkan ADR-0010 — dipakai ulang &
dilengkapi, bukan dibangun dari nol.

- [x] ✅ T-095 — Migration `guardians` (akun login terpisah dari kolom
      `members.guardian_name/guardian_phone/guardian_relation` yang
      SUDAH ADA sejak Fase 3 — kolom lama itu tetap sebagai data
      kontak kartu anggota, TIDAK dimigrasikan otomatis), pivot
      `guardian_member` (many-to-many + `is_primary`, satu wali bisa
      punya banyak anak), `notification_logs` (channel/template/
      payload/status — beda dari tabel `notifications` bawaan Laravel
      yang dipakai bel in-app Fase 15), `notification_settings` (toggle
      per-wali). Alter `topup_requests`: tambah `payment_provider`
      (default 'manual'), `payment_reference` (ADR-0010 — struktur
      disiapkan untuk Midtrans/Xendit Fase 19+, BUKAN diaktifkan) +
      `guardian_id` (di luar spec tertulis eksplisit, perlu untuk tahu
      wali MANA yang mengajukan saat satu anak punya >1 wali).
- [x] ✅ T-096 — Login HP+password (BUKAN OTP WhatsApp — spec asli
      masih menulis itu sebagai opsi, CATATAN-PERBAIKAN.md sudah
      putuskan definitif password). **TIDAK lewat Fortify** — Fortify
      terikat satu guard (`config/fortify.php: 'guard' => 'web'`),
      Portal Wali pakai guard `guardian` terpisah (`config/auth.php`,
      provider `guardians` → model `Guardian`), jadi `Wali\AuthController`
      ditulis manual (login/logout). Rate limiter `wali-login` (5x/menit
      per nomor HP, bukan per IP — wali sekeluarga bisa berbagi
      jaringan) **sudah disiapkan sejak awal** di
      `FortifyServiceProvider` dengan komentar eksplisit menunjuk ke
      tiket ini — tinggal dipasang ke route. `AdjustSessionLifetime`
      diperluas: guard `guardian` dapat timeout 2 jam (CATATAN-
      PERBAIKAN.md §Fase16), guard-aware supaya tidak bentrok dengan
      role Spatie yang cuma ada di guard `web`.
- [x] ✅ T-097 — `WaliLayout.tsx` (scaffold kosong sejak Fase 0) diisi
      penuh: header baca `guardianAuth` dari shared props (bukan prop
      manual), bottom-nav 4 tab. Halaman: `Wali/Dashboard.tsx` (kartu
      per anak + saldo), `Wali/Members/Show.tsx` (saldo + riwayat
      belanja & top-up digabung satu timeline, diurutkan tanggal),
      `Wali/Topup/Create.tsx` (pilih anak, nominal, upload bukti —
      `Storage::disk('public')`, pola sama dengan avatar upload di
      `ProfileController`). **Dilingkupi ke isi tiket literal** ("lihat
      saldo & riwayat anak, ajukan top-up") — grafik pemakaian 30 hari,
      pola belanja per kategori, dan pengajuan limit harian dari spec
      Livewire asli SENGAJA tidak dibangun (di luar cakupan tiket
      resmi, bisa disusulkan terpisah).
      **Gap nyata ditemukan**: T-095..T-100 sama sekali tidak menyebut
      cara ADMIN membuat akun Guardian — tanpa itu sistem login tidak
      bisa dipakai. Ditambahkan `Admin\GuardianController` (buat/
      hubungkan akun dari tab "Wali" yang sudah ada di sheet ubah
      anggota `Members/Index.tsx`, reset password, aktif/nonaktifkan),
      digabung ke gate `member.update` yang sudah ada — bukan modul
      permission baru.
- [x] ✅ T-098 — `Admin/TopupRequests/Index.tsx` (halaman baru, tab
      saudara "Deposit" via `PageTabs` — pola Fase UI-01) +
      `TopupRequestService` (submit/approve/reject). Approve memanggil
      `DepositService::record()` LANGSUNG (bukan wrapper `topup()` yang
      terikat `payment_method_id`/sesi kasir) — top-up wali tidak
      pernah lewat laci kasir (ADR-0010). Bug nyata: **role treasurer
      TIDAK punya satu pun permission `topup`** padahal T-098 eksplisit
      minta "admin/treasurer" — `RolePermissionSeeder` diperbaiki
      (`topup.view`+`topup.approve`).
- [x] ✅ T-099 — `WhatsAppGatewayInterface` + `NullGateway` (log-only,
      binding config-driven di `AppServiceProvider` lewat
      `services.whatsapp.gateway` — ganti ke Fonnte/Wablas nanti tanpa
      ubah kode pemanggil, ADR-0010) + `GuardianNotificationService`
      (satu tempat semua template pesan + pencatatan `notification_logs`,
      command tidak pernah panggil gateway langsung).
- [x] ✅ T-100 — **Rekonsiliasi 2 sumber yang tidak identik**: judul
      tiket resmi bilang "piutang jatuh tempo, saldo rendah" (2 item),
      spec Livewire asli bilang low-balance + weekly-summary + birthday
      (3 command lain). Keduanya tidak kontradiktif — dibangun SEMUA
      (4 command): `notify:low-balance` (07:00, ambang PER-WALI dari
      `notification_settings`, bukan satu ambang global), `notify:
      receivable-due` (08:00, sesuai kata tiket resmi, spec asli tidak
      punya command terpisah untuk ini), `notify:weekly-summary`
      (Ahad 19:00), `notify:birthday` (06:05 — TEPAT SETELAH
      `member:birthday-bonus` 06:00 yang sudah ada sejak fase awal,
      supaya pesan mereferensikan bonus yang BENAR-BENAR sudah
      diberikan, mode-aware deposit/kupon).

**Bug lain ditemukan & diperbaiki di luar 6 tiket, semua lewat
verifikasi Playwright browser sungguhan (bukan cuma tinker)**:
- `HandleInertiaRequests::share()` crash 500 (`Call to undefined
  method Guardian::getRoleNames()`) — `$request->user()` (guard
  default) resolve ke instance `Guardian` setelah login wali, karena
  `Authenticate` middleware memanggil `Auth::shouldUse('guardian')`
  saat guard itu berhasil autentikasi (perilaku standar Laravel
  multi-guard, bukan bug framework). Diperbaiki: eksplisit
  `$request->user('web')`.
- `crypto.randomUUID()` (dipakai `newIdempotencyKey()` di Deposit/Pos/
  SaleReturns) butuh secure context (HTTPS/localhost) — di
  `http://s-mart.test` method itu TIDAK ADA sama sekali di
  `window.crypto`, melempar TypeError yang menggagalkan SELURUH submit
  (bukan cuma kehilangan idempotency). Disentralkan ke
  `resources/js/Lib/idempotency.ts` dengan fallback non-crypto, dipakai
  ulang di 4 halaman (termasuk `Wali/Topup/Create.tsx`).
- Prop `flash.success/error/warning/info` dibagikan dari SETIAP
  controller sejak Fase 1 tapi TIDAK PERNAH dibaca di frontend mana pun
  (grep `flash` di `resources/js` hanya muncul di deklarasi tipe) — user
  tidak pernah melihat konfirmasi aksi lewat toast. `useFlashToast()`
  (baru, dipakai `AdminLayout` & `WaliLayout`) memperbaikinya untuk
  SELURUH aplikasi, bukan cuma Fase 16.
- `Admin\GuardianController::store()` membuat password acak untuk akun
  wali baru tapi tidak pernah menampilkannya ke admin — tidak ada cara
  menyampaikannya ke orang tua. Diperbaiki: disertakan di flash
  message, sama seperti pola `resetPassword()`.
- Render React `{g.pivot.is_primary && <Badge/>}` menampilkan teks
  literal "0" saat `is_primary` bernilai `0` (tinyint mentah dari
  pivot Eloquent, bukan boolean) — diperbaiki `Boolean(...)`.

**Verifikasi:** alur end-to-end penuh via Playwright browser
sungguhan (bukan cuma tinker) — admin buat & hubungkan akun wali →
lihat password awal di toast → wali login → beranda tampil anak yang
terhubung → detail anak (saldo+riwayat) → ajukan top-up dengan unggah
bukti (file PNG asli) → admin lihat pengajuan status Menunggu di tab
Verifikasi Top-Up Wali → setujui → saldo wali bertambah tepat sesuai
nominal → akses `/wali/anak/{id}` milik anak LAIN (bukan miliknya) →
404 (bukan 403 — route model binding + `NotFoundHttpException`
eksplisit, supaya tidak membocorkan keberadaan record ke wali yang
tidak berhak). `pint --test`/`tsc --noEmit`/`eslint`/`build` bersih.
4 command notifikasi dijalankan manual, tidak error. DB direset ke
seed bersih (`migrate:fresh --seed`) setelah verifikasi.

**Blocking:** Fase 4 selesai (independen dari Fase 5–15, bisa paralel).

## Fase 17-Darurat — Pengerasan Finansial & Kepatuhan `[SELESAI]`

**Disisipkan di luar urutan backlog**, atas permintaan eksplisit user
untuk membaca seluruh modul sisa (Fase 17-19 + ADR + CATATAN-
PERBAIKAN.md) dan mengaudit kondisi NYATA proyek terhadap pengalaman
lapangan/kaidah keilmuan (akuntansi, keamanan, privasi data) — bukan
sekadar mengikuti urutan T-xxx apa adanya. Dua riset paralel baca-saja
menemukan 4 gap yang lebih mendesak daripada menyelesaikan seluruh
scope Fase 17 (yang mencampur hal MENDESAK seperti backup dengan hal
administratif biasa seperti modul karyawan/shift/absensi yang sama
sekali tidak menyentuh risiko finansial). Sistem sudah memegang UANG
SUNGGUHAN (saldo deposit santri) sejak Fase 4, dan baru menambah jalur
top-up jarak jauh oleh wali di Fase 16 — empat gap berikut ditambal
sebelum lanjut ke sisa Fase 17 yang bersifat administratif:

- [x] ✅ **Backup nyata diaktifkan (irisan T-101/T-102 — bukan
      seluruhnya).** `spatie/laravel-backup` sudah ter-install &
      ter-publish sejak awal proyek tapi **0% aktif** — `routes/
      console.php` tidak pernah menjadwalkannya. Kalau server crash
      hari ini, seluruh saldo deposit + jurnal seluruh anggota bisa
      hilang permanen tanpa cadangan. Diaktifkan: `backup:run`
      (02:00), `backup:clean` (02:30, retensi 30 hari sesuai
      ADR-0008), `backup:monitor` (03:00). `config/backup.php`
      disempitkan dari `base_path()` penuh (kode sudah di git, backup
      harian seluruh codebase di shared hosting cuma buang disk) jadi
      HANYA `storage/app/public` (file upload pengguna — bukti
      transfer top-up wali, avatar) + database. Ditemukan &
      diperbaiki sekalian: `mysqldump` tidak ada di PATH Windows/
      Laragon dev (`config/database.php` tambah `dump.dump_binary_path`
      env-driven, kosong di Linux produksi). **Diverifikasi end-to-
      end sungguhan**: `backup:run` manual → zip berisi dump SQL valid
      → di-restore ke DB terpisah → 87 tabel + data utuh dikonfirmasi.
      **Belum dikerjakan** (sisa T-101/T-102 asli, disusulkan bareng
      sisa Fase 17): upload offsite Backblaze B2 (kredensial belum
      ada), tombol "Uji Restore" di UI, notifikasi kegagalan diuji
      dengan skenario gagal sungguhan (baru konfigurasi mail target).
- [x] ✅ **Rekonsiliasi bank top-up wali** (perbaikan atas T-098 Fase
      16). `TopupRequestService::approve()` sebelumnya murni "percaya
      foto" — admin klik setuju, saldo bertambah, tanpa satu pun
      langkah yang memaksa mencocokkan dengan mutasi rekening koran
      sungguhan. Vektor fraud klasik koperasi/kantin sekolah (foto
      direkayasa, atau transfer ke rekening pribadi bukan resmi).
      Ditambahkan kolom `bank_verified_by`/`bank_verified_at` +
      parameter wajib `bool $bankVerified` di `approve()` (menolak
      dengan `DomainException` kalau `false`) + checkbox eksplisit di
      `Admin/TopupRequests/Index.tsx` ("Saya sudah mencocokkan
      pengajuan ini dengan mutasi rekening koran sekolah") yang
      mengunci tombol submit sampai dicentang, plus field catatan
      opsional. Bukan penundaan proses — satu langkah sadar yang
      mencegah klik-cepat berdasar foto semata.
- [x] ✅ **Kepatuhan data pribadi anak minimum** (UU PDP 27/2022 —
      bukan audit hukum penuh). Tiga gap: (1) `guardians` belum pakai
      `SoftDeletes` sama sekali (beda dari `Member` sejak Fase 3) —
      ditambahkan, supaya riwayat approval top-up tidak kehilangan
      integritas referensial kalau akun wali dihapus; (2) tidak ada
      jejak consent — `guardian_member.consent_given_at` diisi
      otomatis saat admin menghubungkan wali (representasi consent
      TERDOKUMENTASI, bukan tanda tangan digital consent eksplisit
      dari wali sendiri, karena akun dibuat admin bukan self-
      registrasi — dicatat apa adanya, tidak dipalsukan sebagai
      consent hukum penuh); (3) field sensitif tersimpan plaintext —
      `Member.phone`/`address`/`guardian_phone` diberi cast
      `'encrypted'` Laravel (kolom diperlebar ke TEXT via SQL mentah,
      bukan `Blueprint::change()` yang butuh doctrine/dbal belum
      ter-install). **Keputusan penting**: `nis` (dicari via LIKE di
      `MemberController::index()`), `guardians.phone` (dipakai
      `Auth::attempt()` untuk login), dan `birth_date` (dipakai
      `whereMonth`/`whereDay` di command bonus & notifikasi ulang
      tahun) **SENGAJA TIDAK dienkripsi** — cast `encrypted` Laravel
      pakai IV acak per panggilan (non-deterministik), kolom yang
      butuh WHERE/LIKE/lookup akan RUSAK TOTAL bila dienkripsi
      (ditemukan &dikoreksi sebelum sempat merusak login/pencarian,
      lewat audit pemakaian kolom di seluruh `app/` sebelum menulis
      migration). Diverifikasi lewat tinker: nilai di DB mentah
      berupa ciphertext, terbaca otomatis via Eloquent, login &
      pencarian nama/nis tetap jalan normal.
- [x] ✅ **Audit trail finansial dasar.** `spatie/activitylog` sudah
      ter-install sejak awal proyek tapi cuma dipakai di 1 model
      (`Member`) — `TopupRequest`, `Guardian`, `DepositTransaction`
      (tiga model paling langsung terkait uang wali) tidak ter-log
      sama sekali. Ditambahkan `LogsActivityCustom` (trait yang sudah
      ada) ke ketiganya. `TopupRequestController::approve()` juga
      menerima field `note` opsional (beda dari `reject()` yang sudah
      mewajibkan `reject_reason`) supaya admin bisa menulis konteks
      tambahan tanpa memperlambat kasus normal. Diverifikasi: tabel
      `activity_log` terisi untuk create/update ketiga model.

**Catatan non-temuan** (sengaja dicek saat audit, ternyata SUDAH baik,
tidak disentuh): skema kolom uang seluruh proyek konsisten
`bigInteger` (bukan float/decimal, standar industri). Jurnal otomatis
top-up wali tetap terbit benar meski lewat `DepositService::record()`
langsung (bukan wrapper `topup()`) — observer bekerja berdasar kolom
`type` data, bukan call-path service, jadi desainnya sudah tahan
terhadap jalur masuk yang berbeda.

**Verifikasi:** `php artisan backup:run` manual → restore ke DB
terpisah → 87 tabel & data utuh. Tinker: enkripsi dikonfirmasi
(ciphertext di DB mentah, plaintext via Eloquent), login guardian
tetap jalan, `approve()` menolak tanpa `bank_verified`, `activity_log`
terisi untuk 3 model baru. Playwright: dialog approve top-up menampilkan
checkbox wajib, tombol submit terkunci sampai dicentang, approve
berhasil dengan catatan opsional, status berubah ke "Disetujui",
console bersih. `pint --test`/`tsc --noEmit`/`eslint`/`build` bersih.
DB direset ke seed bersih setelah verifikasi.

**Lanjut ke:** sisa Fase 17 (T-103 halaman pengaturan bertab, T-104
danger zone ketik ulang nama toko+password owner, modul karyawan/
shift/absensi/checklist toko dari spec asli — semua administratif,
tidak mendesak) → Fase 18 (testing, hardening keamanan lanjutan
termasuk temuan riset ini yang belum ditambal: rate-limit reset
password Fortify kosong, `APP_DEBUG` default `true` tanpa
`.env.production.example`, `SESSION_SECURE_COOKIE` tidak pernah
di-set, header keamanan CSP/X-Frame-Options/HSTS belum ada, deploy) →
Fase 19 (storefront publik, prioritas terendah karena tidak ada risiko
finansial/keamanan).

## Fase 17 — Pengaturan Sistem `[SELESAI — T-101..T-104]`

- [x] ✅ T-101 — `spatie/laravel-backup` nyata: mysqldump + gzip *(aktif sejak Fase 17-Darurat; upload offsite Backblaze B2 & tombol Uji Restore terpisah ditunda ke deploy produksi sungguhan — butuh kredensial B2 asli, lihat `.env.production.example`)*
- [x] ✅ T-102 — Cron backup harian 02:00 + `backup:clean` 02:30 + `backup:monitor` 03:00 *(aktif sejak Fase 17-Darurat)*
- [x] ✅ T-103 — Halaman pengaturan bertab (lihat catatan di bawah — cakupan & arsitektur direvisi dari tiket asli)
- [x] ✅ T-104 — Konfirmasi bahaya ketat: reset data transaksi (ketik nama toko + password owner + jeda 5 detik) *(reset SELURUH sistem sengaja tidak dibangun sebagai tombol web — lihat catatan)*

**Blocking:** Fase 13 selesai.

**Catatan implementasi T-103/T-104 (revisi dari tiket & spec asli):**

- **T-103 secara literal menyasar `config/pos.php`** (file statis), tapi
  spec asli menghendaki tabel `settings` ber-DB dengan 9 tab. Menulis
  ulang file `.php` di disk lewat HTTP request tidak standar untuk
  produksi (butuh izin write filesystem yang sering diblokir di shared
  hosting, tidak atomik di bawah concurrent request, dan bertentangan
  langsung dengan `php artisan config:cache`). **Dibangun dengan pola
  "DB override menimpa config file"**: tabel `settings` (key-value,
  sesuai spec asli) + `SettingsOverrideService::apply()` dipanggil di
  `AppServiceProvider::boot()`, menimpakan isi tabel ke `config('pos.*')`
  sebelum request ditangani (di-cache, invalidate saat setting
  disimpan). Semua pemanggil `config('pos.xxx')` yang sudah tersebar di
  codebase TIDAK diubah sama sekali — tetap baca lewat helper `config()`
  biasa, nilainya sekarang bisa ditimpa dari DB.
- **Cakupan T-103 sengaja dipersempit** dari 9 tab spec asli: Transaksi/
  Deposit & PIN/Struk/Promo & Poin/Inventori mengikuti 24 key nyata
  `config/pos.php`; tab **Profil Toko** (nama/alamat/telepon) ditambah
  karena kebutuhan dasar yang belum ada di mana pun. Tab **Notifikasi**
  sengaja di-skip — gateway WhatsApp (Fase 16) sudah env-driven
  (ADR-0010); memindahkan token API ke tabel `settings` yang bisa
  diedit lewat UI justru MENURUNKAN keamanan (secret di DB+admin panel,
  bukan `.env` server-only). Tab **Backup** juga tidak dibangun sebagai
  form — cukup daftar read-only dari `Storage::disk('local')->
  allFiles()` di halaman Danger Zone, tanpa tabel metadata `backups`
  terpisah dari spec asli (sumber-kebenaran-ganda dengan disk).
- **T-104**: spec asli minta dua tombol — "reset data transaksi" dan
  "reset seluruh sistem". **Hanya reset data transaksi yang dibangun
  sebagai tombol web** (`SystemResetController::resetTransactions()`,
  truncate daftar eksplisit tabel transaksi, FK checks dimatikan
  sementara — TRUNCATE MySQL auto-commit, bukan `DB::transaction()`).
  Tombol "hapus SEMUA termasuk akun & master data" yang bisa diklik
  siapa pun berperan owner dari browser adalah risiko yang tidak
  proporsional untuk aplikasi yang memegang uang sungguhan — reset
  total tetap tersedia lewat `php artisan migrate:fresh --seed` di
  server (akses SSH), bukan endpoint HTTP. Sebelum truncate, sistem
  menjalankan `backup:run` otomatis sebagai jaring pengaman sungguhan,
  dan menulis 2 baris `activity_log` (`log_name=system`, mulai &
  selesai) — `activity_log` sendiri SENGAJA tidak ikut ter-truncate,
  supaya riwayat audit (termasuk aksi reset ini) tidak hilang.
  Dialog konfirmasi mewajibkan: ketik ulang nama toko persis, password
  owner, checkbox paham, dan jeda 5 detik sebelum tombol submit aktif
  (mencegah klik reflex).
- **Modul karyawan/shift/absensi/checklist-toko/kritik-saran** dari
  spec asli **tidak dibangun di paket ini** — belum punya tiket resmi
  sebelumnya (hanya disebut informal di catatan Fase 17-Darurat).
  Diformalkan sebagai **T-120–T-124** di bawah, backlog eksplisit untuk
  paket berikutnya, supaya tidak hilang dari tracking maupun perlu
  riset ulang.

**Verifikasi:** `php artisan migrate` bersih. Tinker: ubah
`settings.pos.rounding_step` → `config('pos.rounding_step')` di proses
PHP baru ikut berubah; hapus baris → kembali ke default `config/pos.php`.
Playwright: ubah nilai tab Transaksi → toast sukses → reload tetap
persist; Danger Zone → tombol submit terkunci sampai nama toko cocok +
password terisi + checkbox + jeda 5 detik selesai; setelah reset:
`members`/`products`/`users`/`settings` utuh, `sales`/`topup_requests`
kosong, file backup baru muncul di disk, 2 baris `activity_log` tercatat.
`pint --test`/`tsc --noEmit`/`eslint`/`build` bersih. DB dibersihkan
dari data uji (`settings` di-truncate) setelah verifikasi.

**Tiket baru (backlog, belum dikerjakan) — modul administratif spec
asli tanpa tiket resmi sebelumnya:**

- [ ] ⬜ T-120 — Karyawan: **perluasan tabel `users`** (tambah kolom
      `position`, `join_date` — BUKAN tabel `employees` terpisah
      seperti spec asli; kolom `employee_code` sudah ada di `users`
      sejak migration `2026_07_30_172630`, staf sudah 1:1 dengan akun
      login, tabel terpisah cuma menduplikasi data)
- [ ] ⬜ T-121 — Shift & jadwal kerja (tabel `shifts`, pivot jadwal per
      karyawan per tanggal)
- [ ] ⬜ T-122 — Absensi via PIN (reuse mekanisme PIN member yang
      sudah ada di `config('pos.pin_length')` dst, bukan sistem PIN
      terpisah)
- [ ] ⬜ T-123 — Checklist buka/tutup toko per outlet (checkbox +
      foto per item)
- [ ] ⬜ T-124 — Kritik & saran: halaman publik `/saran` (QR di struk)
      + panel respons admin

**Blocking (T-120–T-124):** tidak memblokir Fase 18/19 — modul
administratif, tidak menyentuh risiko finansial/keamanan.

## Audit Keamanan Menyeluruh Lintas-Fase `[SELESAI — Phase A]`

Diminta audit menyeluruh (Principal Engineer/Architect/Security/
Performance/QA sekaligus) atas seluruh codebase, bukan cuma mengikuti
backlog tiket. Tiga riset paralel (baca-saja) dijalankan: keamanan &
konfigurasi, performa & data layer, kualitas kode & arsitektur —
totalnya ~45 temuan. Detail lengkap ketiganya ada di riwayat sesi;
ringkasan & keputusan skop didokumentasikan di sini.

**Keputusan skop:** tidak mungkin menambal 45 temuan sekaligus secara
bertanggung jawab — `tests/` masih kosong (T-105 belum digarap), jadi
setiap perubahan cuma bisa diverifikasi manual, dan menggabungkan
puluhan perubahan sekaligus di file paling sensitif (`SaleService`,
`CashierSessionService`, `RoleController`) bikin verifikasi tidak
reliable. **Phase A** (dikerjakan sekarang) mengambil 7 temuan
CRITICAL/HIGH keamanan yang punya kesamaan: jalur konkret uang/barang
bisa "bocor" dari sistem HARI INI kalau ada kasir/admin nakal atau akun
dikompromikan — beda kelas dari technical debt biasa. Ditambah 4
hardening murah berisiko nyaris nol.

**A1 — Price override tanpa otorisasi (CRITICAL).**
`SaleService::complete()` menerima `items[].price_override` dan
menimpa harga tanpa cek apa pun — permission `sale.change_price` ada
di seeder tapi 0 referensi di kode manapun; UI POS pun tidak pernah
mengirim field ini (satu-satunya jalur field ini terisi adalah request
yang dirakit manual/DevTools). Ditambal: kalau ada baris dengan harga
berubah, wajib `price_override_approver_id` yang benar-benar
`->can('sale.change_price')` (reuse pola `VoidService::void()`) —
tanpa itu, `DomainException`. `price_changed_by` diisi approver
sungguhan, bukan kasir.

**A2 — Tutup sesi kasir: approver tidak diverifikasi (CRITICAL).**
Docblock `CashierSessionService::close()` sudah lama bilang
"dicek di controller lewat AuthorizationService" — nyatanya
`CashierSessionController::close()` cuma `User::find($approver_id)`
tanpa cek permission sama sekali (bug regresi dari desain asli, bukan
kesengajaan). Selisih kas bisa "disetujui" siapa saja termasuk diri
sendiri. Ditambal: `CashierSessionService::close()` sekarang menolak
kalau approver tidak `->can('pos.approve')`. Frontend sudah benar
sejak awal (`SupervisorPinDialog permission="pos.approve"` di
`CashierSession/Index.tsx`) — tidak disentuh.

**A3 — Eskalasi privilege lewat Role & User (HIGH).**
`RoleController::update()` men-`syncPermissions()` apa pun yang lolos
`exists:permissions,name` — role `admin` bisa memberi dirinya sendiri
`system.reset`/`deposit.adjust`/dst (6 permission eksklusif owner).
`UserController::store()`/`update()` bisa assign role `owner` ke user
baru/lama tanpa cek apa pun. Ditambal: aktor tidak bisa memberi
permission yang dia sendiri tidak punya (aturan umum, otomatis cover
permission baru di masa depan); role `owner` & assignment role=owner
cuma boleh oleh pemegang role owner.

**A4 — Idempotency key digenerate ulang tiap klik (HIGH).**
5 lokasi frontend (POS, Deposit×3, Retur, Top-up wali) memanggil
`newIdempotencyKey()` di DALAM handler submit — klik dobel/network
lambat = key baru tiap kali = dedup backend tidak pernah kena. Ditambal:
key dibuat sekali per form/keranjang (`useRef`), dipakai ulang untuk
semua retry sampai sukses, baru di-generate ulang setelah sukses.
Bonus: `TopupRequestService::submit()` (jalur yang TIDAK punya dedup
service-level sama sekali) ditambah guard tolak pengajuan identik
(wali+anak+nominal) dalam 60 detik terakhir.

**A5 — Diskon nota manual tanpa otorisasi, di-clamp diam-diam (HIGH).**
`bill_discount` di atas `max_discount_percent` sebelumnya dipotong
diam-diam (bukan ditolak) — `sale_items.subtotal` tetap pakai diskon
promo asli sementara `sales.total_discount` dipotong, jadi
`SUM(sale_items.subtotal) != grand_total`. Permission
`sale.discount_over_limit` 0 referensi, kolom `discount_approved_by`
tidak pernah ditulis. Ditambal: pola sama seperti A1 — wajib
`discount_approver_id` valid, tanpa itu TOLAK (bukan clamp).

**A6 — Settings menyimpan nilai apa pun tanpa validasi (HIGH).**
`SettingController::update()` (T-103, baru saja dibangun sesi
sebelumnya) cuma `['nullable']` untuk SEMUA field — `no_pin_threshold`
bisa di-set sangat besar (bypass PIN untuk SEMUA transaksi deposit),
`max_discount_percent` bisa 100. Ditambal: `Rule::in`/`min`/`max` nyata
per field. **Sekalian ditutup temuan kualitas kode terkait**: 3 dari 7
field yang sebelumnya "mati" (owner ubah, tidak berpengaruh) sekarang
disambungkan — `AuthorizationService`/`MemberPinService` baca
`config('pos.pin_max_attempts')`/`pin_lockout_minutes'` (sebelumnya
hardcode 3/15). Model `Setting` ditambah `LogsActivityCustom` (audit
trail perubahan pengaturan finansial, belum ada sama sekali).
(4 field lain — `rounding_step`/`rounding_mode`/`tax_percent`/
`low_stock_threshold_percent` — TETAP belum disambungkan ke pemakainya;
dicatat sebagai backlog Phase D, bukan lubang keamanan, cuma fitur
belum lengkap.)

**A7 — Bukti transfer top-up wali di disk publik (HIGH).**
Tersimpan di `storage/app/public/topup-proofs` — bisa diakses lewat
URL `/storage/...` TANPA login sama sekali. Isinya foto mutasi rekening
bank (no. rekening, nama pengirim, nominal — data finansial wali
santri), kontradiksi langsung dengan kerja enkripsi UU PDP di Fase
17-Darurat. Ditambal: disk `local` (private) + route baru
`GET /admin/topup-requests/{id}/proof` ber-`can:topup.view`, streaming
file — bukan URL statis.

**A8 — Hardening murah tambahan (LOW/MEDIUM, risiko nyaris nol):**
`/uji-komponen` sekarang dibungkus `app()->environment('local')`
(sebelumnya publik di produksi tanpa auth apa pun); `ReportExport`
sekarang paksa `TYPE_STRING` untuk nilai yang diawali `=+-@` (cegah
formula injection `=HYPERLINK(...)` dari input produk/supplier bebas
lewat Excel export); `config/app.php` dapat safety-net serupa
`SESSION_SECURE_COOKIE` — `debug` paksa `false` kalau
`APP_ENV=production` apa pun isi `.env`; `bootstrap/app.php`
`withExceptions()` (sebelumnya kosong total) sekarang punya
`renderable` untuk `DomainException` → redirect back dengan flash error
terkontrol untuk request Inertia, bukan 500 mentah (menutup jalur Wali
yang sebelumnya tidak ada try/catch sama sekali).

**Verifikasi:** `pint --test`/`tsc --noEmit`/`eslint`/`build` bersih.
Tinker: A1/A5 diuji dengan 3 skenario (tanpa approver → ditolak,
approver tanpa izin → ditolak, approver sah → berhasil dengan kolom
approval terisi benar) via `SaleService::complete()` langsung dengan
sesi kasir & stok nyata. A2 diuji serupa (approver tanpa `pos.approve`
→ ditolak, dengan → berhasil). A7 diuji: file benar-benar landing di
disk `local`, TIDAK ada di disk `public`. Playwright: A3 dikonfirmasi
dari halaman Role & Izin (checkbox `system.reset` untuk role admin
tetap tidak tercentang setelah reload meski dicoba dicentang+simpan)
dan halaman Pengguna (user baru role=owner tidak tercipta); A6
dikonfirmasi lewat query DB langsung (`no_pin_threshold=999999999`
TIDAK tersimpan sama sekali, bukan cuma dicek dari tampilan form).
DB dibersihkan dari seluruh data uji setelah verifikasi.

**Backlog Phase A** (supaya ~38 temuan sisanya tidak hilang dari
tracking):

- **Phase B (security, MEDIUM)** — lihat bagian tersendiri di bawah,
  **SUDAH DIKERJAKAN**.
- **Phase C (performa)** — 4 temuan CRITICAL pertama **SUDAH
  DIKERJAKAN**, lihat bagian tersendiri di bawah. Sisa backlog
  performa (Phase C-lanjutan, belum dikerjakan): cache `PromoEngine`
  (9 query/baris tanpa cache) & batch lookup akun `JournalService`
  (6-10 query/nota); index & sargability tanggal (26 pemakaian
  `whereDate()` non-sargable di report/dashboard — index sudah
  ditambah, tapi query-nya sendiri belum diubah ke bentuk sargable);
  agregasi laporan di SQL (semua `app/Reports/*.php` `summary()`
  tarik SEMUA baris ke PHP, bukan `SUM`/`GROUP BY`); caching read-heavy
  (Category/Brand/Unit/Account/Navigation nyaris 0 caching di seluruh
  app, termasuk shared props `HandleInertiaRequests` tiap response);
  bundle frontend (`Dashboard.js` 417KB, Recharts tidak lazy-load,
  tidak ada `manualChunks` vendor splitting). `StockService::consume()`
  (8-14 query/baris, konsumsi FEFO layer-by-layer) SENGAJA tidak
  disentuh di Phase C — kode paling sensitif untuk integritas stok,
  butuh pass tersendiri dengan kehati-hatian ekstra.
- **Phase D (code quality/arsitektur)** — pisah `JournalService`
  (mesin posting vs mesin laporan keuangan, 532 baris jadi satu);
  ekstrak `DashboardService` (326 baris, satu-satunya controller yang
  menyimpang pola, duplikasi verbatim `scopedQuery()` dari
  `ReportController`); **setup CI** (GitHub Actions menjalankan
  pint/tsc/eslint/build/test — nilai tertinggi per-jam karena jadi rem
  buat SEMUA temuan lain, saat ini semua gerbang kualitas dijalankan
  manual); konsolidasi format tanggal (`Lib/date.ts` cuma 3 importer,
  23 halaman lain format manual dengan hasil visual BEDA) & uang
  (`<Money>` vs `toLocaleString` manual, "Rp " vs "Rp" beda spasi);
  hapus dead code (`app/Support/Money.php` — 0 pemanggilan,
  `sales.rounding` selalu 0, fitur T-004 setengah jadi; trait
  `HasReference`/`BelongsToOutlet` — 0 pemakai; folder `app/Data/`/
  `app/Enums/` kosong sejak T-003); sambungkan 4 field Settings yang
  masih mati (`rounding_step`/`rounding_mode`/`tax_percent`/
  `low_stock_threshold_percent`); bereskan `payroll_deductions` (tabel
  write-only, tidak ada UI/laporan sama sekali) & `exchanges` (fitur
  backend lengkap, 0 UI — T-072 sengaja ditunda, tapi tetap kode mati
  yang di-maintain); konsolidasi aturan bucket aging (6 tempat) &
  "stok rendah" (4 tempat, 2 sumber data BEDA — Dashboard & halaman
  Stok bisa tampilkan angka kritis berbeda); `Lib/api.ts` wrapper
  `fetch()` (token XSRF di-copy-paste 4× — kelas bug yang sudah 2×
  menggigit proyek ini).

## Audit Keamanan Menyeluruh Lintas-Fase — Phase B `[SELESAI]`

Lanjutan Phase A, mengambil 4 temuan security MEDIUM yang didokumentasikan
sebagai backlog eksplisit di atas.

**B1 — `cashier_session_id`/`outlet_id` tidak diverifikasi milik aktor.**
`SaleService::complete()` & `hold()` sebelumnya cuma `exists:...` untuk
kedua field — kasir A bisa memasukkan penjualan ke sesi kasir B (uang
di laci A, selisih muncul di laporan tutup sesi B), dan `outlet_id`
sembarang bisa memotong stok outlet lain dari terminal yang tidak
berhak. Ditambal: sesi HARUS `user_id`-nya sama dengan aktor yang
login, dan `outlet` SELALU diambil dari sesi (`$session->outlet_id`) —
bukan dari input klien. `outlet_id` di request tidak lagi berpengaruh
ke data apa pun (sisanya field kosmetik untuk request shape).

**B2 — `hold()`/`recall()` tanpa validasi & tanpa cek kepemilikan.**
`SaleController::hold()` sebelumnya `$this->saleService->hold($request->all())`
mentah — item non-array bisa memicu TypeError 500. `recall()` bisa
mengambil SEKALIGUS menghapus permanen hold kasir lain hanya dengan
menebak ID berurutan, tanpa cek apa pun. Ditambal: `HoldSaleRequest`
(FormRequest baru, validasi penuh shape cart); `SaleService::hold()`
verifikasi kepemilikan sesi (pola sama B1); `SaleService::recall()`
sekarang butuh `User $actor` — pemilik hold ATAU pemegang `pos.approve`
(supervisor/admin/owner, untuk skenario serah terima shift) yang boleh
mengambil. Frontend `Pos/Index.tsx` diperbarui menampilkan pesan error
kalau recall ditolak (sebelumnya diam-diam jadi keranjang kosong).

**B3 — Throttle PIN override supervisor di-key GLOBAL per-permission.**
`AuthorizationService::throttleKey()` sebelumnya cuma
`"authorization-override:{permission}"` — 3 PIN salah dari SATU
terminal mengunci override permission itu untuk SEMUA orang di SEMUA
terminal selama 15 menit (kasir bisa memicu ini sengaja untuk
memblokir void/approve selisih kas/dll di seluruh toko). Ditambal:
key sekarang menyertakan `auth()->id()` (fallback IP kalau somehow
tidak ada) — satu kasir yang mengunci dirinya sendiri tidak lagi
memengaruhi kasir lain. (Catatan: karakteristik "satu tebakan PIN
diuji terhadap semua user pemegang permission" TIDAK diubah — itu
konsekuensi dari alur "cukup masukkan PIN" tanpa identifikasi
username, perubahan itu di luar skop perbaikan ini.)

**B4 — Reset password wali tanpa notifikasi ke wali.**
`GuardianController::resetPassword()` sebelumnya mengubah password
tanpa wali diberi tahu sama sekali — satu-satunya sinyal bagi wali
(kalau bukan dia yang minta) adalah tiba-tiba tidak bisa login.
Ditambal: `GuardianNotificationService::passwordReset()` (kanal WA
sama seperti notifikasi lain) selalu dikirim setelah reset, plus baris
`activity_log` eksplisit (`log_name=security`) mencatat admin mana
yang mereset password wali mana — beda dari log "updated Guardian"
generik yang tidak jelas menyebut ini reset password.

**Verifikasi:** `pint --test`/`tsc --noEmit`/`eslint`/`build` bersih.
Tinker (2 kasir + 1 admin, sesi & stok nyata): B1 — kasir B kirim
`cashier_session_id` milik kasir A → ditolak; B2 — kasir B `hold()` ke
sesi kasir A → ditolak, kasir B `recall()` hold milik kasir A →
ditolak, admin (`pos.approve`) `recall()` hold yang sama → berhasil;
B3 — kasir A dikunci setelah 3x PIN salah, kasir B tetap dapat respons
"PIN tidak cocok" normal (BUKAN "terlalu banyak percobaan") di
permission yang sama; B4 — `NotificationLog` berisi baris
`template=password_reset status=sent`, `activity_log` berisi baris
`log_name=security` dengan nama admin & wali. DB dibersihkan dari
data uji setelah verifikasi.

## Audit Performa Menyeluruh Lintas-Fase — Phase C `[SELESAI, sebagian]`

Lanjutan Phase A/B, mengambil 4 temuan performa CRITICAL (urutan
rekomendasi agent performa) — semua di jalur checkout POS, titik yang
paling menentukan apakah target ADR-0008 (p95 <800ms @ 30 concurrent
user) bisa tercapai.

**C1 — Lock contention `ReferenceGenerator::increment()`.**
`DB::transaction()` di dalamnya SELALU nested di dalam transaksi
pemanggil (mis. `SaleService::complete()`) — Laravel cuma bikin
SAVEPOINT, row lock `reference_counters` (counter GLOBAL, `outlet_id=0`)
tertahan sampai SELURUH transaksi checkout selesai. Ini SATU-SATUNYA
temuan yang membuat "30 concurrent user" tidak tercapai berapa pun
cepatnya query lain — semua kasir antre satu per satu di titik ini.
Ditambal: koneksi PDO **terpisah** (`config/database.php` →
`reference_counters`, sama persis ke DB yang sama tapi transaksi
independen) + `INSERT ... ON DUPLICATE KEY UPDATE` atomik, transaksi
counter jadi top-level sendiri — commit dalam hitungan milidetik.
**Dibuktikan lewat 2 proses PHP paralel sungguhan** (bukan cuma baca
kode): proses 1 buka transaksi luar, generate reference, `sleep(3)`
(simulasi checkout lambat) sebelum commit; proses 2 (start konkuren)
minta reference di tengah-tengah — sebelumnya proses 2 akan tertahan
sampai proses 1 commit (~3 detik), SEKARANG proses 2 selesai dalam
**0.04 detik**, dengan nomor urut tetap benar (0001, 0002, 0003 —
tidak ada duplikat/lompat).

**C2 — N+1 checkout `SaleService::complete()`.**
Sebelumnya `Product::findOrFail()`/`Unit::findOrFail()`/
`UnitConversion::where()->first()` dipanggil per BARIS keranjang (3
query/baris di luar harga) — keranjang 10 item = 30+ query cuma untuk
resolusi produk/satuan. Ditambal: batch sekali sebelum loop
(`Product::findOrFail($ids)`, `Unit::findOrFail($ids)`, satu query
`UnitConversion::whereIn()` untuk semua kombinasi yang butuh konversi),
`findOrFail()` semantics (lempar `ModelNotFoundException` kalau ada ID
tidak valid) tetap terjaga karena Eloquent mendukungnya native untuk
array. `PriceService::getActivePrice()` **TIDAK** ikut di-batch —
dipakai luas di banyak service lain, batching-nya butuh perubahan API
bersama yang di luar skop perbaikan checkout ini (dicatat di backlog
Phase C-lanjutan). Diverifikasi: keranjang 2 produk (1 butuh konversi
satuan factor 12, 1 satuan dasar) → `qty_base` & `grand_total` benar
persis, `findOrFail()` tetap melempar `ModelNotFoundException` untuk
product_id tidak valid.

**C3 — Index database hilang.** `sales` (dashboard & semua Report
filter `status='completed'` + rentang tanggal TANPA `outlet_id` —
index `status` tunggal kardinalitas rendah diganti komposit
`['status','sale_date']`), `activity_log` (`created_at`, tabel audit
tercepat tumbuh, sebelumnya cuma index `log_name`), `sale_items`
(`promo_id`, dipakai `PromoEngine::checkQuota()` & laporan penjualan
per produk — ternyata SUDAH punya FK ke `promos` tapi tanpa index
pendukung untuk query WHERE/JOIN biasa). Migration diuji idempoten
penuh (`migrate` → `rollback` → `migrate` lagi, dua kali, bersih).

**C4 — Queue worker tidak pernah dijadwalkan.** Docblock
`GenerateReportExportJob` (T-089, ekspor laporan >5000 baris — SATU-
SATUNYA jalur ekspor besar yang ADR-0008 izinkan) sudah lama menyebut
cron `queue:work --stop-when-empty` per menit, tapi baris jadwalnya
tidak pernah ditulis — job menumpuk di tabel `jobs`, tidak pernah
dikonsumsi, fitur ekspor besar rusak total secara diam-diam. Ditambal:
`Schedule::command('queue:work --stop-when-empty --max-time=50')->
everyMinute()->withoutOverlapping()` di `routes/console.php` (flag
`--stop-when-empty` wajib — shared hosting ADR-0008 tanpa Supervisor,
daemon yang jalan selamanya akan langsung di-kill hosting provider).
Diverifikasi: dispatch job uji → `queue:work --stop-when-empty` →
job diproses (RUNNING → DONE, 766ms) → keluar bersih (exit 0) → tabel
`jobs` kosong, `failed_jobs` kosong.

**Verifikasi:** `pint --test` bersih (frontend tidak disentuh Phase
C, jadi `tsc`/`eslint`/`build` tidak perlu diulang). `php artisan test`
tetap hijau (T-105 belum digarap, baseline tidak berubah). Playwright
end-to-end sungguhan: login kasir → buka sesi → scan barcode produk
nyata → bayar tunai → `Sale` tercipta di DB dengan status `completed`
dan reference urut benar (`INV-20260801-0002`) — membuktikan C1+C2
tidak merusak alur checkout normal. DB direset (`migrate:fresh --seed`)
setelah verifikasi.

## Fase 18 — Pengujian, Keamanan & Penyiapan

**Catatan:** beberapa gap keamanan konkret di T-106/T-109 sudah
ditambal lebih awal (di luar urutan, sama seperti Fase 17-Darurat),
karena berupa perbaikan kecil-terisolasi (config/middleware) yang
tidak perlu menunggu Fase 17 selesai — BUKAN scope T-105/T-107/T-108/
T-110 penuh (test suite, optimasi index, uji beban, seeder demo tetap
menunggu gilirannya):

- Rate limit `password.email`/`password.update` Fortify — sebelumnya
  TIDAK ADA sama sekali (beda dari `login`/`two-factor`/`passkeys`
  yang sudah dilindungi sejak awal; dicek langsung di `vendor/laravel/
  fortify/routes/routes.php`, Fortify tidak menyediakan hook
  `config('fortify.limiters.*')` untuk 2 route ini). Ditambal lewat
  `App\Http\Middleware\ThrottlePasswordReset` (global, memeriksa nama
  route sendiri) — sempat dicoba lewat `Route::getRoutes()->
  getByName(...)->middleware()` di `FortifyServiceProvider::boot()`,
  terbukti rapuh (cuma bekerja kalau `boot()` dipanggil dua kali,
  bergantung urutan boot provider paket vs provider app yang tidak
  konsisten) — middleware global jauh lebih pasti. Diverifikasi:
  5 percobaan lolos, percobaan ke-6 ditolak.
- `App\Http\Middleware\SecurityHeaders` (global) — `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-
  Security` (hanya saat HTTPS). **Content-Security-Policy SENGAJA
  TIDAK disertakan** — CSP yang salah konfigurasi bisa mematikan
  seluruh app (skrip anti-FOUC inline di `app.blade.php`, Vite dev
  assets), risikonya lebih besar daripada manfaat buru-buru pasang
  tanpa pengujian lintas-halaman menyeluruh — ditunda ke T-106 penuh.
- `.env.production.example` (baru, sebelumnya tidak ada sama sekali)
  — `.env.example` biasa masih `APP_DEBUG=true` sebagai default,
  risiko nyata kalau deploy produksi menyalinnya apa adanya (stack
  trace bocor ke publik). Template baru ini eksplisit menandai field
  WAJIB DIISI (kredensial DB/SMTP/domain) dan aman secara default
  (`APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true`, `LOG_LEVEL=error`).
- `config/session.php`: kolom `'secure'` diberi *safety net* — otomatis
  `true` kalau `APP_ENV=production` meski `SESSION_SECURE_COOKIE` lupa
  di-set di `.env` (sebelumnya `env('SESSION_SECURE_COOKIE')` tanpa
  default berarti `null`/cookie tidak dipaksa HTTPS-only). Guard `web`
  DAN `guardian` (Portal Wali) sama-sama pegang data finansial. Bug
  ditemukan saat implementasi: sempat ditulis pakai
  `app()->environment('production')` di dalam file config, meledak
  ("Target class [env] does not exist") karena config dimuat sebelum
  container sepenuhnya siap — diperbaiki baca `env('APP_ENV')` langsung.

- [x] ✅ T-105 — Test suite Pest: aturan bisnis kritis (revert kupon, konsinyasi no-jurnal, retur non-tunai, `receivable_limit`, floor HPP, ISO days_of_week) — lihat catatan di bawah
- [ ] ⬜ T-106 — Hardening keamanan (CSP, 2FA Fortify, audit log lengkap semua model) *(rate limit reset password + security headers dasar + audit log Topup/Guardian/DepositTransaction sudah — lihat catatan di atas & Fase 17-Darurat)*
- [ ] ⬜ T-107 — Optimasi query + index MySQL (lihat `CATATAN-PERBAIKAN.md` § Field Indexing) *(index `sales`/`activity_log`/`sale_items.promo_id` + fix N+1 checkout + lock contention `ReferenceGenerator` sudah — lihat "Audit Performa Menyeluruh Lintas-Fase — Phase C"; sisa: cache PromoEngine/JournalService, sargability `whereDate()`, agregasi laporan di SQL)
- [ ] ⬜ T-108 — Uji beban k6/wrk (30 concurrent user, target <800ms p95 — ADR-0008)
- [ ] ⬜ T-109 — Deploy Hostinger (langkah shared hosting, cron scheduler) *(`.env.production.example` sudah — lihat catatan di atas)*
- [ ] ⬜ T-110 — Seeder demo lengkap untuk onboarding tim non-teknis

**Catatan T-105:** `tests/Pest.php` **TIDAK PERNAH ADA** sejak Fase 0
meski `pestphp/pest-plugin-laravel` sudah ter-install — tanpa file ini,
test bergaya fungsional (`it(...)`) jatuh ke `PHPUnit\Framework\TestCase`
polos (bukan `Tests\TestCase`), aplikasi Laravel tidak pernah ter-boot,
dan pemanggilan facade apa pun langsung "A facade root has not been
set." Ditambal: `tests/Pest.php` (`pest()->extend(Tests\TestCase::class)
->in('Feature','Unit')`), `tests/TestCase.php` (`protected $seed = true`
— seed sekali per RUN, bukan per test, sebelumnya nyaris dicoba manual
`$this->seed()` per test = 1 file 2 test jadi >6 menit). `phpunit.xml`
diganti dari SQLite `:memory:` (driver `pdo_sqlite` bahkan tidak
aktif di php.ini environment ini) ke MySQL `s_mart_test` terpisah dari
dev (`s_mart_dev`) — proyek ini konsisten pakai fitur MySQL-spesifik
di banyak migration (`ALTER ... MODIFY COLUMN ... ENUM(...)`) yang
tidak portable ke SQLite tanpa penulisan ulang luas.

Perbaikan ini juga membongkar bug NYATA di `ReferenceGenerator` (Phase
C) — koneksi `reference_counters` di-hardcode driver `mysql`, gagal
total di bawah SQLite; sekarang ikut `env('DB_CONNECTION')` + SQL
upsert dicabang per driver (`ON DUPLICATE KEY UPDATE` MySQL vs
`ON CONFLICT DO UPDATE` SQLite) — portable tanpa mengorbankan fix
lock contention Phase C.

6 aturan bisnis diuji (lewat service nyata — `SaleService::complete()`,
`VoidService`, `SaleReturnService`, `PromoEngine` — bukan mock):
revert kupon saat void (termasuk kasus kupon yang sudah dibatalkan
admin TIDAK boleh hidup lagi), konsinyasi murni (terima & retur TIDAK
ada jurnal, jual ADA jurnal tapi ke Utang Konsinyasi bukan Penjualan
biasa), retur non-tunai (refund deposit balik ke `balance_cache`
member), `receivable_limit` (tolak kalau piutang aktif+baru melebihi
limit, kecuali ada approver), floor HPP (diskon promo tidak boleh
menembus `avg_cost`, dipotong + warning bukan ditolak), ISO
`days_of_week` (Senin=1..Minggu=7, bukan konvensi Carbon default).
13 test, 31 assertion, seluruhnya hijau termasuk 2 `ExampleTest`
boilerplate lama (tidak regresi). Total run ~58 detik (migrasi+seed
sekali ~45-50 detik, tiap test individual <1 detik lewat transaksi+
rollback RefreshDatabase).

**Blocking:** Fase 17 selesai (semua fase bisnis selesai).

## Fase 19 — Storefront Publik *(baru)*

- [ ] ⬜ T-111 — `ProductPublicData` DTO (saring HPP/margin/stok — ADR-0009)
- [ ] ⬜ T-112 — Halaman katalog publik + detail produk
- [ ] ⬜ T-113 — Halaman promo publik (`promos.is_public`)
- [ ] ⬜ T-114 — Cek saldo publik (input nomor kartu, tanpa login)
- [ ] ⬜ T-115 — Caching agresif (`cache_ttl_minutes`) + SEO dasar

**Blocking:** Fase 2 & Fase 10 selesai (independen dari Fase 3–9, 11–18).

## Fase UI-01 — Fondasi UI `[SELESAI]`

Modul asli `docs/fase-ui-01-v2.md` merancang fase ini untuk dikerjakan
SEBELUM Fase 1 ("kalau dikerjakan belakangan, 45 halaman harus
di-refactor"). Backlog aktual proyek ini (bagian ini sendiri)
SENGAJA memindahkannya ke akhir urutan dengan syarat blocking "Fase 8
selesai" — syarat itu sudah lama terpenuhi (dikerjakan sekarang di
titik setelah Fase 14, atas pilihan eksplisit user, supaya
halaman-halaman Fase 15+ lahir langsung dengan struktur navigasi yang
benar alih-alih menambah utang refactor).

- [x] ✅ T-116 — `config/navigation.php` (16 entri: 1 Dashboard + 15
      grup modul, permission-aware) + `app/Services/NavigationService.php`
      (`forUser()` — filter OR-permission per item, drop grup kosong,
      resolve `route()` + status aktif) dibagikan lewat prop Inertia
      global `navigation` (`HandleInertiaRequests::share()`). **Bukan
      45 halaman** seperti perkiraan modul asli — `php artisan
      route:list --path=admin` menghasilkan **36 route index nyata**
      (beberapa sudah tergabung natural sejak fase awal, mis. blok
      Void ada di halaman CashierSession, bukan halaman sendiri).
      **Konsolidasi dikerjakan lewat `PageTabs` yang menghubungkan
      route/controller/halaman yang SUDAH ADA — bukan menggabung
      controller jadi satu.** Modul asli membayangkan 1 controller per
      grup dengan tab internal (mis. `/admin/produk` melayani 4 tab
      sekaligus) — itu berarti merombak ulang 30+ controller yang
      sudah teruji lengkap sejak Fase 1-14, risiko tinggi tanpa
      manfaat fungsional (cuma kosmetik navigasi). Tiap controller
      anggota grup cukup tambah SATU baris `'tab' => 'xxx'` di
      `Inertia::render()` yang sudah ada; halaman `.tsx` terkait
      tambah `<PageTabs current={tab} tabs={[...]} />` di bawah
      `PageHeader`. Sidebar jadi 16 entri memetakan penuh 36 route:
      Dashboard, Kasir, Sesi & Kas (Sesi Kasir·Kas), Deposit, Retur &
      Koreksi (Retur Penjualan·Write-Off), Produk (Produk·Kategori·
      Brand·Satuan), Stok (Ringkasan·Opname·Transfer·Penyesuaian),
      Pembelian (PO·Pembelian·Konsinyasi), Anggota (Anggota·Poin),
      Promo (Promo·Kupon), Hutang & Piutang (Hutang·Piutang),
      Akuntansi (Bagan Akun·Jurnal·Buku Besar·Neraca Saldo·Laba Rugi·
      Neraca·Periode), Laporan (grid kartu, bukan tab — pola sendiri
      sejak Fase 14), Mitra & Outlet (Supplier·Outlet·Metode Bayar),
      Pengguna & Sistem (Pengguna·Role & Izin·Log Aktivitas). Menu
      "Karyawan"/pengaturan lengkap (shift/absensi/backup) dari modul
      asli TIDAK dibuat sebagai menu kosong — belum ada satu route pun
      untuk itu (Fase 17 belum dikerjakan).
- [x] ✅ T-117 — `AdminLayout.tsx` dirombak: root `flex h-screen
      overflow-hidden`, `main` jadi satu-satunya `overflow-y-auto`
      (sebelumnya seluruh body ikut scroll, tanpa region scroll
      independen). **Scope diperkecil dari rencana modul asli** — modul
      asli minta `html, body, #app { overflow: hidden }` global lalu
      "kecualikan" Public/Wali lewat CSS kondisional; `PosLayout.tsx`
      ternyata SUDAH benar (`h-screen overflow-hidden` sejak awal),
      `PublicLayout.tsx`/`GuestLayout.tsx` SUDAH benar (`min-h-screen`
      natural scroll) — keduanya tidak disentuh, cukup terapkan pola
      yang sama ke `AdminLayout` saja, hasil akhir identik tanpa perlu
      pengecualian layout lain. `PageTabs.tsx` (baru, reusable) —
      props `{tabs:{key,label,href,permission?}[], current}`, filter
      tab dari `auth.user.permissions` yang sudah dibagikan sejak awal,
      navigasi via `router.visit(href,{preserveScroll:true})`, `null`
      jika tab yang lolos filter ≤1 (tidak render UI tab yang percuma).
      Dipasang ke 34 dari 36 route (2 pengecualian by design: Dashboard
      solo-item, Laporan pakai grid kartu sendiri).
- [x] ✅ T-118 — Diaudit `grep -rn "dark:" resources/js --include=*.tsx
      | grep -v Components/ui` → hanya **4 titik bocor nyata** (bukan
      berserakan separah dikhawatirkan modul asli), semua pola sama
      (`bg-navy-100 dark:bg-navy-700 text-navy-500 dark:text-navy-200`
      badge ikon, atau `text-navy-600 dark:text-navy-200` untuk tautan)
      di `EmptyState.tsx`, `StatCard.tsx`, `Pos/Index.tsx`,
      `Purchases/Index.tsx` — diganti token yang SUDAH ADA & theme-aware
      sejak Fase 0 (`bg-secondary text-secondary-foreground` untuk
      badge, `text-primary hover:underline` untuk tautan), bukan token
      baru. **Skema token modul asli (gaya Tailwind v3, RGB terpisah)
      TIDAK dipakai apa adanya** — proyek sudah punya sistem Tailwind
      v4 sendiri (`surface/bg/border/content/content-muted` + palet
      `navy-50..900`/`gold`/`teal`/dst, dipetakan penuh ke variabel
      shadcn) yang sudah dipakai konsisten di ~40 halaman sejak Fase 0;
      tidak ditulis ulang. Sidebar sengaja TETAP hardcode
      `bg-navy-800`/`text-navy-50` (bukan token terpisah) — desain
      Fase 0 yang konsisten dipakai, navy gelap permanen di kedua mode
      adalah pilihan sengaja, bukan kebocoran. `dark:` yang tersisa di
      `Public/Welcome.tsx`/`PublicLayout.tsx` (2 titik) sengaja TIDAK
      disentuh — itu styling brand publik pra-Fase-UI-01 yang
      independen dari sistem tema admin, di luar cakupan. `ThemeToggle.tsx`
      (baru) — dropdown 3 pilihan (Terang/Gelap/Sistem) di atas
      `useThemeStore` yang sudah lengkap sejak Fase 0 (termasuk skrip
      anti-FOUC di `app.blade.php`) — tinggal pasang UI-nya.
- [x] ✅ T-119 — Header admin ditambah: tombol Ctrl+K membuka
      `<CommandDialog>` shadcn placeholder ("Pencarian tersedia di Fase
      15" — sesuai modul asli, isi lengkap ditunda), ikon lonceng
      statis (badge dinamis butuh query per modul tersebar, bukan
      pekerjaan navigasi murni, tidak diminta eksplisit T-116..T-119 —
      struktur `badge?` sudah disiapkan di `config/navigation.php`
      untuk perluasan nanti), `<ThemeToggle />`. Breadcrumb sudah ada
      sejak Fase 0 lewat `PageHeader`, tidak dirombak.
      **Bug keamanan nyata ditemukan & diperbaiki saat memetakan
      permission navigasi:** route `admin/activity-logs` TIDAK punya
      middleware permission SAMA SEKALI (`routes/admin.php`), dan
      `ActivityLogController` juga tanpa `authorize()` internal — siapa
      pun yang login (termasuk kasir) bisa lihat log aktivitas seluruh
      sistem. Ditambahkan `->middleware('can:setting.view')`, konsisten
      dengan halaman pengaturan lain. Ini menegakkan prinsip "3 lapis"
      modul asli (sidebar+route+controller) — nav yang pakai permission
      tanpa rute yang menegakkannya adalah keamanan-lewat-sembunyi yang
      palsu; dikonfirmasi lewat Playwright: kasir1 mengakses
      `/admin/activity-logs` maupun `/admin/journals` langsung via URL
      (bukan lewat menu) tetap 403, bukan cuma hilang dari sidebar.

**Verifikasi:** `pint --test`/`tsc --noEmit`/`eslint`/`build` bersih
(build tanpa peringatan ukuran chunk — sempat ditemukan `import * as
Icons from 'lucide-react'` di draf awal `AdminLayout.tsx` membengkakkan
chunk `PageHeader` dari ~65KB ke 681KB, diperbaiki jadi `ICON_MAP`
eksplisit berisi 15 ikon yang benar-benar dipakai) + grep ulang
`dark:` di luar `Components/ui` pada `resources/js/Pages/Admin`,
`Components/common`, dan `AdminLayout.tsx` → kosong. **Verifikasi
Playwright browser sungguhan lintas 6 role** (owner/admin/supervisor/
kasir1/warehouse/treasurer): menu tiap role cocok persis peta
permission (owner/admin 15 grup penuh, supervisor 7 grup — kehilangan
Deposit/Pembelian/Promo/Hutang&Piutang/Akuntansi/Mitra&Sistem karena
tidak punya permission-nya, kasir 9 grup, warehouse 6 grup, treasurer
7 grup), tidak ada grup kosong yang lolos ke UI, akses langsung URL
tanpa permission → 403 (diuji silang per role: supervisor/kasir1 ke
`/admin/journals`, treasurer ke `/admin/products`), akses ke halaman
yang MEMANG diizinkan → 200, dark mode toggle Terang↔Gelap mengganti
class `.dark` di `<html>` tanpa error, tab `PageTabs` diuji navigasi
antar-tab (klik) DAN persist saat reload langsung di URL tab
bukan-pertama (`/admin/opnames` tetap menampilkan tab "Opname" aktif
setelah `page.reload()`, bukan reset ke tab pertama), console browser
bersih di semua role. DB direset ke seed bersih
(`migrate:fresh --seed`) setelah verifikasi.

**Blocking:** Fase 8 selesai — dikerjakan setelah Fase 14, atas
pilihan eksplisit user, sebelum lanjut ke Fase 15.

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
