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
