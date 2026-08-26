# URUTAN KERJA V2 — PROMPT SIAP SALIN

Setiap blok adalah **satu sesi baru** di Claude Code / OpenCode. Klik
**New session** sebelum tiap blok. Jangan menyambung dua sesi dalam satu
sesi — konteks penuh dan kualitas menurun.

Mode: mulai dengan **Plan**, ganti ke **Edit automatically** setelah rencana
disetujui.

---

## PETA SESI LENGKAP

```
PRE-CODING (dari folder pre-coding/)
├─ pre-00  Setup environment lokal
├─ pre-01  Graphify referensi (opsional)
├─ pre-02  Grill requirement → CONTEXT.md + ADR
├─ pre-03  SPEC.md + backlog tiket
├─ pre-04  Setup 9Router
├─ pre-05  Peta komponen shadcn/ui
└─ pre-06  Gerbang kesiapan ngoding

CODING
├─ Sesi 1   Fase 0    Fondasi (Laravel + Inertia + React + TS + shadcn)
├─ Sesi 2   Fase UI-01 Navigasi, mode gelap, sidebar
├─ Sesi 3   Fase 1    Auth, Role, PIN Supervisor
├─ Sesi 4   Fase 2    Master Data
├─ Sesi 5   Fase 3    Anggota & Kartu
├─ Sesi 6   Fase 4    Deposit & Saldo
├─ Sesi 7   Fase 5    Inventory FEFO
├─ Sesi 8   Fase 6    Pembelian, Konsinyasi, Hutang
├─ Sesi 9   Fase 7    Sesi Kasir & Kas
├─ Sesi 10  Fase 8    Layar Kasir
├─ Sesi 11  Fase 9    Pembayaran Multi-Metode
├─ Sesi 12  Fase 10   Diskon & Promo
├─ Sesi 13  Fase 11   Retur, Void, Koreksi
├─ Sesi 14  Fase 12   Opname, Transfer, Penyesuaian
├─ Sesi 15  Fase 13   Akuntansi
├─ Sesi 16  Fase 14   Laporan
├─ Sesi 17  Fase 15   Dashboard & Analitik
├─ Sesi 18  Fase 19   Storefront Publik (BARU)
├─ Sesi 19  Fase 16   Portal Wali & Notifikasi
├─ Sesi 20  Fase 17   Pengaturan Sistem
└─ Sesi 21  Fase 18   Pengujian, Keamanan, Deploy Hostinger
```

**Perhatikan:** Fase 19 (Storefront) dikerjakan SEBELUM Fase 16 (Portal Wali)
karena storefront jadi kerangka layout publik yang dipakai portal wali.

---

## STATUS TRACKER

Beri centang manual saat sesi selesai:

- [ ] Sesi 1  — Fase 0    Fondasi
- [ ] Sesi 2  — Fase UI-01 Navigasi
- [ ] Sesi 3  — Fase 1    Auth
- [ ] Sesi 4  — Fase 2    Master Data
- [ ] Sesi 5  — Fase 3    Anggota
- [ ] Sesi 6  — Fase 4    Deposit
- [ ] Sesi 7  — Fase 5    Inventory
- [ ] Sesi 8  — Fase 6    Pembelian
- [ ] Sesi 9  — Fase 7    Sesi Kasir
- [ ] Sesi 10 — Fase 8    Layar Kasir
- [ ] Sesi 11 — Fase 9    Pembayaran
- [ ] Sesi 12 — Fase 10   Diskon
- [ ] Sesi 13 — Fase 11   Retur & Void
- [ ] Sesi 14 — Fase 12   Opname
- [ ] Sesi 15 — Fase 13   Akuntansi
- [ ] Sesi 16 — Fase 14   Laporan
- [ ] Sesi 17 — Fase 15   Dashboard
- [ ] Sesi 18 — Fase 19   Storefront
- [ ] Sesi 19 — Fase 16   Portal Wali
- [ ] Sesi 20 — Fase 17   Pengaturan
- [ ] Sesi 21 — Fase 18   Pengujian & Deploy

---

## SESI 1 — FASE 0: FONDASI

**Prasyarat:** semua pre-coding (00-06) sudah lolos. Gerbang kesiapan sudah
dibuka.

```
Baca dokumen berikut sebagai konteks:
- @README-v2.md (konteks global, aturan kode, struktur folder)
- @CATATAN-PERBAIKAN.md (semua perbaikan dari review)
- @fase-00-v2.md (spesifikasi lengkap Fase 0)

Kerjakan Fase 0 sesuai @fase-00-v2.md. Jangan sentuh fase lain.

Output yang saya harapkan:
1. Perintah composer & npm lengkap
2. Semua file konfigurasi (vite.config.ts, tsconfig.json, tailwind.config.js,
   app.blade.php, app.tsx)
3. Struktur folder sesuai README-v2.md § "STRUKTUR FOLDER"
4. Helper Money.php (backend) dan Money.tsx (frontend)
5. ReferenceGenerator.php
6. Komponen dasar shadcn/ui yang di-install lengkap (button, card, input,
   dialog, dst — lihat pre-05)
7. Komponen custom minimum: PageHeader, Money, StatCard, EmptyState,
   DataTable, BulkActionBar, PinInput
8. AdminLayout, PublicLayout, WaliLayout, GuestLayout, PosLayout (skeleton)
9. Landing page dummy "Skillage Mart POS" (halaman /) untuk uji render
10. Konfigurasi Fortify (login/register/logout dasar)

Konteks penting:
- MySQL 8 di Laragon, database "skillage_mart_dev" sudah ada
- .env DB_CONNECTION=mysql, DB_DATABASE=skillage_mart_dev, DB_USERNAME=root
- Belum ada fitur bisnis di fase ini
- TypeScript strict mode ON
- Jangan install Livewire, Redis, Reverb
```

**Verifikasi manual:**
- [ ] `php artisan serve` jalan tanpa error
- [ ] `npm run dev` jalan tanpa error
- [ ] Buka http://localhost:8000 → landing page dummy tampil (React)
- [ ] `php artisan migrate:fresh` sukses
- [ ] `php artisan tinker` → `use App\Support\Money; echo Money::format(12500);`
      → menghasilkan "Rp 12.500"
- [ ] File `resources/js/Components/ui/button.tsx` ada (shadcn)
- [ ] Import `<Button>` dari komponen ini bekerja di React page dummy
- [ ] `resources/js/Pages/Welcome.tsx` render tanpa error TypeScript
- [ ] `tsconfig.json` dengan strict: true

```
commit dengan pesan "Fase 0: fondasi Laravel + Inertia + React + shadcn"
```

---

## SESI 2 — FASE UI-01: NAVIGASI, MODE GELAP, SIDEBAR

```
Kerjakan @fase-ui-01-v2.md. Jangan sentuh fase lain.

Konteks:
- AdminLayout dari Fase 0 sudah ada tapi masih skeleton
- Fase ini menyempurnakan AdminLayout dengan sidebar penuh, mode gelap
  via CSS variable, dan sistem tab reusable
- Belum ada modul bisnis, jadi menu di sidebar masih dummy — yang
  penting struktur navigasi terpusat via config/navigation.php sudah
  siap

Ikuti dokumen mulai Bagian 1 (scroll bertumpuk) sampai Bagian 5 (mode
gelap) berurutan.
```

**Verifikasi manual:**
- [ ] Buka halaman admin dummy → hanya satu scrollbar vertikal, tidak ada
      horizontal
- [ ] Toggle mode gelap → refresh → tidak ada kedipan putih
- [ ] Sidebar bisa dilipat jadi 68px, tooltip label muncul saat hover ikon
- [ ] Grup menu bisa buka-tutup, status tersimpan di localStorage
- [ ] `config/navigation.php` ada, NavigationService bekerja
- [ ] `<Tabs>` reusable dari shadcn dipakai di halaman uji
- [ ] Layar kasir (dummy) juga mendukung mode gelap
- [ ] Semua komponen custom Fase 0 (PageHeader, StatCard, dst) dipakaikan
      token warna, bukan hex langsung

```
commit dengan pesan "Fase UI-01: navigasi, mode gelap, sidebar"
```

---

## SESI 3 — FASE 1: AUTH, ROLE, PIN SUPERVISOR

```
Kerjakan @prompts/fase-01.md (versi asli) dengan aturan translasi
Livewire → React yang ada di @README-v2.md § "ATURAN TRANSLASI".

Perbaikan yang WAJIB diterapkan (dari @CATATAN-PERBAIKAN.md):
- Permission "receivable.write_off" TIDAK dipakai. Ganti dengan
  "receivable.delete" (hanya owner). Istilah di UI: "Hapus Piutang".
- Rate limit login: 5x/menit per IP, via Laravel throttling middleware.
- Session timeout: cashier 30 menit, admin 2 jam, owner 8 jam.
  Implementasi via middleware custom yang set config('session.lifetime')
  berdasarkan role.
- Password hash: bcrypt cost 12 (default Laravel 12 sudah 12).
- Fortify diaktifkan tapi 2FA belum wajib. Persiapan struktur ada,
  aktivasi per user di Fase 17.

Field tambahan di tabel users (untuk konteks online):
- last_login_ip (string, nullable)
- last_login_user_agent (string 500, nullable)
- two_factor_enabled (bool, default false)
- two_factor_secret (text, nullable)

Halaman auth pakai GuestLayout dari Fase 0. Semua form pakai
react-hook-form + zod schema.

Halaman kelola pengguna, kelola role, log aktivitas → pakai AdminLayout,
tabel pakai DataTable, form pakai Sheet dari shadcn.

Komponen PinInput sudah ada di Fase 0.
Modal supervisor pakai <Dialog> shadcn.
```

**Verifikasi manual:**
- [ ] Login owner/password → dashboard tampil
- [ ] Login salah 5x → rate limit 429
- [ ] Login sebagai kasir → session logout otomatis setelah 30 menit idle
- [ ] Modal PIN supervisor bekerja: 3x salah → kunci 15 menit
- [ ] Kelola user: create, edit, aktif/nonaktif, reset password, set PIN
- [ ] Kelola role: matriks permission bekerja
- [ ] Log aktivitas mencatat IP, user agent, action, before/after

```
commit dengan pesan "Fase 1: auth, role, PIN supervisor"
```

---

## SESI 4 — FASE 2: MASTER DATA

```
Kerjakan @prompts/fase-02.md dengan aturan translasi di @README-v2.md.

Perbaikan yang WAJIB diterapkan:
- Tabel product_prices → immutable. Tidak ada updated_at. Ganti harga =
  tutup baris lama (isi effective_to) + insert baris baru.
- Tabel products, tambah kolom BARU untuk storefront:
  * is_visible_public (bool, default false) — tampil di storefront?
  * slug (unique) — URL friendly
  * description_public (text, nullable) — deskripsi untuk publik
  * public_order (int, nullable) — urutan tampil di storefront
- Tabel product_images (baru): id, product_id, path, alt, sort_order,
  is_primary — multi-gambar per produk
- Kolom HPP/margin hanya boleh dilihat oleh yang punya
  product.view_cost permission — implementasi via Policy + hidden
  props di Inertia

Import produk Excel: gunakan Sheet + Form dari shadcn, hasil validasi
tampil sebagai DataTable dengan badge error per baris.

Cetak label harga: pakai barryvdh/laravel-dompdf, output PDF A4 grid,
33x15mm & 50x25mm.
```

**Verifikasi manual:**
- [ ] CRUD produk berjalan, multi-barcode terupdate benar
- [ ] Ganti harga → baris lama effective_to terisi, baris baru muncul
- [ ] `product_prices` tidak punya updated_at (immutable)
- [ ] Multi-gambar produk berfungsi, primary image bisa dipilih
- [ ] `is_visible_public=false` → produk tidak muncul di /produk (uji nanti
      di Fase 19)
- [ ] User tanpa permission `product.view_cost` tidak lihat kolom HPP
- [ ] Import Excel 30 baris → validasi per baris muncul benar

```
commit dengan pesan "Fase 2: master data + kolom storefront"
```

---

## SESI 5 — FASE 3: ANGGOTA & KARTU

```
Kerjakan @prompts/fase-03.md dengan aturan translasi.

Perbaikan yang WAJIB diterapkan (dari CATATAN-PERBAIKAN):
- HAPUS field `allow_negative` dan `credit_limit` dari tabel members.
- GANTI dengan `receivable_limit` (bigint, default 0) — batas total
  piutang aktif per anggota (dipakai di Fase 9).
- `blocked_categories` tetap json, TAPI tambahkan mekanisme:
  saat kategori dihapus → jalankan job cleanup untuk hapus id kategori
  dari json semua member. Buat listener CategoryDeleting.
- Field `pin_attempts` reset saat login PIN sukses.

Fitur baru untuk konteks online:
- Halaman /cek-saldo (kiosk mode publik) → gunakan PublicLayout mode
  minimal, auto-clear setelah 15 detik, TIDAK butuh login, hanya
  tampilkan: nama, kelas, saldo, 5 transaksi terakhir.

Cetak kartu massal → pakai dompdf, filter kelas/jurusan, output A4
2×4 grid dengan garis potong.
```

**Verifikasi manual:**
- [ ] Kolom `allow_negative` & `credit_limit` TIDAK ADA di tabel members
- [ ] Kolom `receivable_limit` ADA
- [ ] Impor Excel anggota + foto ZIP berfungsi
- [ ] Cetak kartu massal → PDF A4 2×4 grid tampil rapi
- [ ] Halaman /cek-saldo bisa diakses tanpa login, timer 15 detik jalan
- [ ] Delete kategori → job cleanup jalan, blocked_categories bersih

```
commit dengan pesan "Fase 3: anggota, kartu, cek saldo publik"
```

---

## SESI 6 — FASE 4: DEPOSIT & SALDO

```
Kerjakan @prompts/fase-04.md dengan aturan translasi.

Perbaikan yang WAJIB diterapkan:
- Enum DepositType: HAPUS 'transfer_in' dan 'transfer_out' bila tidak
  jelas maksudnya. Kalau memang mau, tambahkan enum baru:
  'card_transfer' → transfer saldo saat ganti kartu (misal kartu hilang,
  saldo pindah ke kartu baru). Tulis penjelasan di komentar enum.
- DepositService::record() WAJIB idempotency_key. Semua caller wajib
  supply. Kalau tidak, throw MissingIdempotencyKeyException.
- Rekonsiliasi harian: tambah kolom `expected_by_recon` di
  deposit_reconciliations untuk melacak selisih akumulatif.

Untuk konteks online:
- Halaman verifikasi top-up transfer di /admin/deposit ?tab=verifikasi
  → tampilkan preview gambar bukti transfer di Dialog shadcn dengan
  react-medium-image-zoom.
- Notifikasi WhatsApp saat top-up terverifikasi → antrian via cron
  queue (bukan Redis).
```

**Verifikasi manual:**
- [ ] Top-up berhasil, saldo terupdate, struk PDF tercetak
- [ ] Dua top-up bersamaan dengan idempotency_key sama → hanya 1 tersimpan
- [ ] Dua top-up bersamaan tanpa idempotency_key → exception
- [ ] Rekonsiliasi harian jalan via `php artisan deposit:reconcile`
- [ ] Verifikasi bukti transfer via admin: preview zoom bekerja
- [ ] Setelah verify → notifikasi tercatat di notification_logs

```
commit dengan pesan "Fase 4: deposit dan saldo"
```

---

## SESI 7 — FASE 5: INVENTORY FEFO

```
Kerjakan @prompts/fase-05.md dengan aturan translasi.

Perbaikan yang WAJIB diterapkan:
- Kolom `stocks.reserved_qty`: HAPUS bila tidak jelas kegunaannya.
  Kalau mau dipertahankan, dokumentasikan: dipakai untuk PO in-transit
  dan Transfer in-transit — bukan untuk hold kasir.
- StockService::consume() SELALU dalam DB::transaction() dengan
  lockForUpdate() pada baris stock_layers.
- Command `stock:check-expiry` — jadwalkan harian 05:00, batch 500
  produk per iterasi untuk hemat memori di shared hosting.

Layar kartu stok pakai DataTable dengan virtualization (TanStack) —
tabel produk bisa ribuan baris.
```

**Verifikasi manual:**
- [ ] Konsumsi FEFO benar urutannya (uji dengan 3 layer beda expired)
- [ ] Stok tidak cukup → InsufficientStockException, rollback bersih
- [ ] Kartu stok load 1000+ baris tetap ringan (virtualization)
- [ ] `stock:check-expiry` jalan, produk mendekati expired dapat notifikasi

```
commit dengan pesan "Fase 5: inventory FEFO"
```

---

## SESI 8 — FASE 6: PEMBELIAN, KONSINYASI, HUTANG

```
Kerjakan @prompts/fase-06.md dengan aturan translasi.

Perbaikan yang WAJIB diterapkan:
- KONSINYASI = MODEL MURNI. Terima konsinyasi → TIDAK BUAT JURNAL.
  Layer stok dibuat dengan is_consignment=true, tapi tidak masuk
  neraca aset. Jual konsinyasi → dibahas di Fase 13 (akuntansi).
- Retur pembelian kredit → MENGURANGI hutang (D Utang Usaha /
  K Persediaan), bukan menambah kas.
- Retur pembelian tunai → menambah kas (D Kas / K Persediaan) atau
  terbit piutang ke supplier (kesepakatan bisnis).
- Alokasi biaya tambahan (ongkir, bongkar) → default proporsional
  by_value, opsi manual per item.

Layar penerimaan barang scan-first (fokus barcode input): pakai
useRef + useEffect untuk auto-focus setelah aksi.
```

**Verifikasi manual:**
- [ ] Terima konsinyasi → jurnal KOSONG untuk items konsinyasi
- [ ] Layer terbentuk dengan is_consignment=true
- [ ] Retur pembelian kredit → hutang usaha berkurang
- [ ] Biaya tambahan tersebar ke HPP dengan benar

```
commit dengan pesan "Fase 6: pembelian, konsinyasi murni, hutang"
```

---

## SESI 9 — FASE 7: SESI KASIR & KAS

```
Kerjakan @prompts/fase-07.md dengan aturan translasi.

Perbaikan yang WAJIB diterapkan:
- Rumus expected cash HAPUS asumsi "total_receivable_payment selalu
  tunai". Pecah jadi: total_receivable_cash (masuk hitungan) dan
  total_receivable_noncash (tidak masuk hitungan uang fisik).
- Verifikasi top-up transfer oleh admin TIDAK butuh sesi kasir aktif
  (masuk akun bank, bukan laci).
- Retur pasca-tutup-sesi: tambah aturan di dokumentasi service —
  bila sesi asal sudah tutup, refund WAJIB non-tunai (deposit atau
  transfer), tidak boleh dari kas laci sesi baru.

Layar tutup sesi: input pecahan uang → grid react-hook-form dengan
perhitungan otomatis. Modal PIN supervisor untuk selisih besar.
```

**Verifikasi manual:**
- [ ] Buka sesi → transaksi tunai → tutup sesi → kolom
      total_sales_cash terisi (bukan 0)
- [ ] Bayar piutang via transfer → masuk `total_receivable_noncash`,
      TIDAK masuk expected cash
- [ ] Verifikasi top-up transfer di /admin/deposit tanpa buka sesi kasir
      → bekerja
- [ ] Sesi lupa tutup → `session:auto-close` menutup paksa

```
commit dengan pesan "Fase 7: sesi kasir dan kas"
```

---

## SESI 10 — FASE 8: LAYAR KASIR

**Aktifkan extended thinking untuk sesi ini — layar kasir paling kompleks
di React.**

```
Kerjakan @prompts/fase-08.md dengan aturan translasi. Ini fase paling
banyak berubah karena Livewire → React murni.

Arsitektur React:
- Page: resources/js/Pages/Pos/Kasir.tsx
- Layout: PosLayout (fullscreen, mode gelap dukung)
- State cart: Zustand store useCartStore
  - items[], subtotal, discount, tax, rounding, total, memberId,
    idempotencyKey (UUID baru per cart, reset saat clearCart)
- State sesi: useSessionStore (aktif/tidak, id, laci)
- Hotkey: react-hotkeys-hook — F1 help, F2 cari, F3 fokus scan,
  F4 hold, F5 recall, F6 anggota, F7 diskon, F8 void, F9 bayar,
  F10 ubah harga, F11 cetak ulang, ESC batal
- Input barcode: auto-focus SETELAH SETIAP AKSI (useEffect + useRef)
- Debounce scan 150ms (useDebouncedCallback)

Perbaikan WAJIB:
- Scan produk yang sama 2x → qty +1 (bukan baris baru). Kunci
  perbandingan: product_id + unit_id + price (bila ada override).
- Scan barcode DUS → qty × faktor konversi (via BarcodeResolverService).
- Kolom `sales.status='hold'` — kalau ada hold saat tutup sesi, tolak.

Backend:
- Route POST /pos/scan, /pos/qty, /pos/remove, /pos/hold, /pos/recall,
  /pos/complete
- Semua endpoint pakai idempotency_key dari cart
- Response Inertia back() dengan flash props supaya state client
  tetap terjaga
```

**Verifikasi manual (WAJIB 3 hal ini duluan):**
- [ ] Buka sesi → penjualan tunai → tutup sesi → total_sales_cash TERISI
- [ ] Hold 1 transaksi → coba tutup sesi → DITOLAK
- [ ] Scan produk sama 2x → qty jadi 2, bukan 2 baris
- [ ] Hotkey F1-F11 semua bekerja
- [ ] Toggle mode gelap → layar kasir juga gelap

```
commit dengan pesan "Fase 8: layar kasir React"
```

---

## SESI 11 — FASE 9: PEMBAYARAN MULTI-METODE

```
Kerjakan @prompts/fase-09.md dengan aturan translasi.

Perbaikan yang WAJIB diterapkan:
- BUANG total metode "Kredit/Tempo" yang bergantung pada
  members.allow_negative (sudah tidak ada di Fase 3).
- Metode "Kredit/Tempo" sekarang cek: total piutang aktif anggota +
  amount ≤ members.receivable_limit. Kalau lewat, tolak kecuali ada
  override supervisor.
- Pembayaran saldo deposit → WAJIB lewat DepositService dengan
  lockForUpdate + idempotency_key.
- Split payment: total pembayaran WAJIB = grand_total. Kembalian hanya
  dari porsi tunai.
- Refund: ikut metode ASAL, TIDAK BOLEH konversi ke tunai (kecuali
  memang asalnya tunai).

Modal pembayaran (React):
- <Dialog> shadcn ukuran lg
- Tab per metode (Tabs shadcn)
- Split payment: list metode terpilih + tombol hapus
- Total bayar, Kurang, Kembalian — di footer sticky
- Tombol F9 SELESAIKAN — disabled bila kurang > 0
```

**Verifikasi manual:**
- [ ] Bayar dua metode (saldo + tunai) → sukses, saldo terpotong benar
- [ ] Dua tab browser: pembayaran deposit bersamaan → saldo tidak minus
- [ ] Kredit di atas receivable_limit tanpa PIN supervisor → ditolak
- [ ] Kredit di atas limit dengan PIN supervisor → sukses, tercatat di
      approved_by
- [ ] Refund saldo → kembali ke saldo, TIDAK ke tunai

```
commit dengan pesan "Fase 9: pembayaran multi-metode"
```

---

## SESI 12 — FASE 10: DISKON & PROMO

**Aktifkan extended thinking.**

```
Kerjakan @prompts/fase-10.md dengan aturan translasi.

Perbaikan yang WAJIB diterapkan:
- promos.days_of_week pakai konvensi ISO 8601: 1=Senin, 7=Minggu.
  Konsisten dengan Carbon::dayOfWeekIso().
- PromoEngine WAJIB return warnings[] dalam hasil bila ada potongan
  yang dikurangi karena hampir menyentuh HPP.
- Kupon: bila nota di-VOID (di Fase 11), status kupon di tabel
  coupons WAJIB kembali ke 'active' (bila belum expired).

Simulator diskon (React): form interaktif dengan react-hook-form,
hasil real-time tanpa reload. Chart urutan prioritas pakai recharts
(bar chart per tahap).

Storefront: promo dengan `is_public=true` tampil di /promo publik.
Tambahkan kolom `is_public` (bool, default false) di tabel promos.
```

**Verifikasi manual:**
- [ ] Simulator: produk clearance + member level + kupon → hasil sesuai
      3 tahap prioritas
- [ ] Harga akhir per item tidak pernah di bawah HPP (uji case ekstrim)
- [ ] Promo hanya Senin → sabtu ditolak, senin sukses
- [ ] `is_public=true` → muncul di /promo publik (uji nanti di Fase 19)

```
commit dengan pesan "Fase 10: diskon dan promo"
```

---

## SESI 13 — FASE 11: RETUR, VOID, KOREKSI

```
Kerjakan @prompts/fase-11.md dengan aturan translasi.

Perbaikan yang WAJIB diterapkan:
- Void sesi tertutup: DITOLAK. Bila perlu koreksi, wajib Retur (bukan
  Void). Bila sesi kasir asal sudah tutup dan asal bayar tunai, refund
  wajib non-tunai (deposit) atau ke rekening (transfer manual admin).
- Void nota WAJIB balikkan:
  * Stok → kembali ke stock_layer via returnToLayer()
  * Saldo deposit → refund via DepositService
  * KUPON → status di tabel coupons kembali ke 'active',
    coupon_redemptions.is_reverted=true (perbaikan review!)
  * Poin → dibatalkan via point_transactions type 'earn_reverted'
  * Piutang → dihapus (soft) dengan alasan void
  * Kas → dikurangi
  * Jurnal → jurnal pembalik (reversing)

Layar retur (React): dua panel — cari nota di kiri, keranjang retur
di kanan. Setiap item: qty, kondisi (baik/rusak), alasan.
```

**Verifikasi manual:**
- [ ] Bayar kupon + saldo → void → kupon aktif lagi, saldo kembali,
      stok ke layer asal (bukan layer baru)
- [ ] Sesi tertutup → coba void → ditolak, ditawari retur
- [ ] Retur pasca-tutup: bayar asal tunai → refund WAJIB non-tunai
      (dropdown "Metode Refund" hilang opsi tunai)

```
commit dengan pesan "Fase 11: retur, void, koreksi"
```

---

## SESI 14 — FASE 12: OPNAME, TRANSFER, PENYESUAIAN

```
Kerjakan @prompts/fase-12.md dengan aturan translasi.

Perbaikan yang WAJIB diterapkan:
- system_qty WAJIB dibekukan (snapshot) saat status → 'counting'.
- Blind count: petugas tidak boleh lihat system_qty (Inertia jangan
  kirim ke React di fase counting).
- Transaksi selama counting → catat ke stock_opname_movements agar
  tidak terhitung ganda.
- Selisih > toleransi (config, default 0.5%) → wajib owner approve.

Wizard opname (React): 5 langkah dengan <Tabs> shadcn (draft →
counting → review → approved → posted). Progress bar (Progress
shadcn) di header.
```

**Verifikasi manual:**
- [ ] Mulai opname → penjualan di tab lain → selisih tidak terpengaruh
- [ ] Fase counting: system_qty tersembunyi di UI React
- [ ] Selisih > 0.5% → tombol "Ajukan Persetujuan" arahkan ke owner

```
commit dengan pesan "Fase 12: opname, transfer, penyesuaian"
```

---

## SESI 15 — FASE 13: AKUNTANSI

**Aktifkan extended thinking.**

```
Kerjakan @prompts/fase-13.md dengan aturan translasi.

Perbaikan yang WAJIB diterapkan (dari CATATAN-PERBAIKAN):

Konsinyasi jurnal — MODEL MURNI:
- Terima konsinyasi → TIDAK ADA JURNAL
- Jual konsinyasi (misal Rp 10.000, komisi sekolah 20%):
    D Kas         Rp 10.000
    K Utang Konsinyasi  Rp 10.000
  Lalu:
    D Utang Konsinyasi  Rp 2.000
    K Pendapatan Komisi Rp 2.000
- Settlement (bayar ke pemilik):
    D Utang Konsinyasi  Rp 8.000
    K Kas               Rp 8.000
- Retur konsinyasi → kurangi layer, tidak ada jurnal

Deposit sebagai KEWAJIBAN (bukan pendapatan):
- Top-up:  D Kas / K Utang Deposit Anggota (2-1200)
- Belanja pakai saldo: D Utang Deposit / K Penjualan
- Bonus ulang tahun: D Beban Promosi / K Utang Deposit
- Tarik saldo: D Utang Deposit / K Kas

Setiap jurnal WAJIB seimbang (D = K). Bila tidak, lempar
JournalUnbalancedException.

Observer/Event Listener pada model Sale, Purchase, DepositTransaction,
CashTransaction — sehingga jurnal terbit OTOMATIS.

Halaman /admin/jurnal (React): 4 tab — Jurnal Umum, Buku Besar,
Neraca Saldo, CoA. Neraca saldo tampilkan total D dan K di footer
sticky (harus persis sama).

Alat "Validasi Jurnal": scan semua transaksi, laporkan yang belum
punya jurnal.
```

**Verifikasi manual:**
- [ ] Terima konsinyasi 100 pcs → CEK: TIDAK ADA jurnal
- [ ] Jual 1 pcs konsinyasi → CEK 2 jurnal seimbang
- [ ] Settlement → jurnal utang → kas
- [ ] Neraca saldo: total debit = total kredit (persis)
- [ ] Validasi jurnal: tidak ada transaksi tanpa jurnal

```
commit dengan pesan "Fase 13: akuntansi, konsinyasi murni"
```

---

## SESI 16 — FASE 14: LAPORAN

```
Kerjakan @prompts/fase-14.md dengan aturan translasi.

Arsitektur:
- Abstract class app/Reports/BaseReport.php dengan method: filters(),
  query(), columns(), summary(), toArray(), toExcel(), toPdf()
- Komponen React generik <ReportViewer report="slug" /> menangani
  filter, paginasi, ekspor, cetak
- Halaman /admin/laporan berisi grid kartu laporan (Card shadcn),
  klik → /admin/laporan/{slug}

Perbaikan WAJIB:
- Widget di dashboard (Fase 15) MEMANGGIL method sama dari BaseReport
  — jangan tulis dua kali (peringatan review saya).
- Ekspor Excel besar → antrian via cron queue, kirim email saat selesai
  (di shared hosting tidak ada Supervisor).

Semua 20+ laporan sesuai dokumen asli. Chart pakai recharts, warna
otomatis ikut mode gelap.
```

**Verifikasi manual:**
- [ ] Buka laporan penjualan harian → filter, sort, ekspor Excel bekerja
- [ ] Ekspor 90 hari → antrean, 5 menit kemudian email masuk berisi link
- [ ] Kasir tidak lihat kolom HPP di laporan penjualan produk

```
commit dengan pesan "Fase 14: modul laporan"
```

---

## SESI 17 — FASE 15: DASHBOARD & ANALITIK

```
Kerjakan @prompts/fase-15.md dengan aturan translasi.

Setiap widget = komponen React dengan lazy loading via <Suspense>.
Data widget berat: cache database driver (bukan Redis), TTL 5 menit.
Invalidate saat ada transaksi terkait.

Chart pakai recharts. Warna ikut mode gelap via CSS variable
(darkMode listener + re-render).

Perbaikan WAJIB:
- Widget "Peringkat kasir" MEMANGGIL BaseReport dari Fase 14,
  bukan query terpisah.
- Widget "Total Saldo Deposit Beredar" tampil di dashboard owner
  sebagai KEWAJIBAN (dengan warning "kewajiban ini bukan pendapatan").
```

**Verifikasi manual:**
- [ ] Dashboard owner: 4 baris widget lengkap
- [ ] Toggle mode gelap → chart ikut berubah warna
- [ ] Widget peringkat kasir sama nilainya dengan laporan Fase 14

```
commit dengan pesan "Fase 15: dashboard dan analitik"
```

---

## SESI 18 — FASE 19: STOREFRONT PUBLIK (BARU)

```
Kerjakan @fase-19-storefront-publik.md. Ini fase BARU, tidak ada di
rencana asli.

Konteks: storefront hanya KATALOG, tidak ada belanja online. Tampil
untuk publik tanpa login. Data produk & promo diambil dari database
POS yang sama.
```

**Verifikasi manual di file fase-19-storefront-publik.md.**

```
commit dengan pesan "Fase 19: storefront publik katalog"
```

---

## SESI 19 — FASE 16: PORTAL WALI & NOTIFIKASI

```
Kerjakan @prompts/fase-16.md dengan aturan translasi.

Perbaikan yang WAJIB diterapkan:
- Login wali: HP + password (BUKAN OTP WA — sudah diputuskan).
- Rate limit login wali: 5x/menit per HP.
- Portal wali pakai WaliLayout (dari Fase 0, mobile-first).
- Halaman:
  * /wali/login → GuestLayout dengan brand wali
  * /wali → kartu per anak (KartuAnak component)
  * /wali/anak/{id} → detail, tabs (Saldo, Riwayat, Top-Up)
  * /wali/top-up → form ajukan top-up (upload bukti transfer)
  * /wali/pengaturan → profil & notifikasi

- Payment gateway: TIDAK DIKERJAKAN di fase ini. Persiapkan struktur
  (kolom payment_provider, payment_reference di topup_requests) tapi
  hanya jalur MANUAL yang aktif.
- WhatsApp gateway: NullGateway sebagai default. FonnteGateway
  implementasi menyusul. Semua kirim via cron queue.

Fitur baru untuk konteks online:
- Session timeout wali: 2 jam
- Cookie SameSite=Lax, Secure (prod), HttpOnly
```

**Verifikasi manual:**
- [ ] Login wali dengan HP+password sukses
- [ ] Kartu tiap anak muncul dengan saldo terkini
- [ ] Ajukan top-up: upload bukti → status pending → admin verifikasi
      di Fase 4
- [ ] Rate limit 5x/menit per HP bekerja

```
commit dengan pesan "Fase 16: portal wali online"
```

---

## SESI 20 — FASE 17: PENGATURAN SISTEM

```
Kerjakan @prompts/fase-17.md dengan aturan translasi.

Perbaikan yang WAJIB diterapkan:
- Tab BAHAYA: konfirmasi wajib ketik ulang nama toko + password owner
  (bukan hanya nama).
- Tab BACKUP jadi tab tersendiri dengan implementasi NYATA (bukan
  hanya UI):
  * php artisan backup:run harian jam 02:00 via cron
  * Backup ke storage/backups + upload ke Backblaze B2
  * Retention 30 hari lokal, 90 hari offsite
  * Notifikasi ke owner bila backup gagal
  * Tombol "Uji Restore" di UI: restore ke DB test, cek integritas,
    laporan hasil
- 2FA di tab Pengguna (aktif dari sini via Fortify, sudah disiapkan
  di Fase 1)

Modul karyawan, kritik saran, checklist harian → seperti dokumen asli
tapi dengan komponen React.
```

**Verifikasi manual:**
- [ ] `php artisan backup:run` → file .sql.gz muncul di
      storage/backups + terupload ke B2
- [ ] "Uji Restore" bekerja tanpa merusak DB produksi
- [ ] Aktifkan 2FA untuk owner → login berikutnya minta kode

```
commit dengan pesan "Fase 17: pengaturan + backup nyata + 2FA"
```

---

## SESI 21 — FASE 18: PENGUJIAN, KEAMANAN, DEPLOY HOSTINGER

**Bisa dipecah jadi 3-4 sesi kalau kuota terbatas.**

```
Kerjakan @prompts/fase-18.md dengan aturan translasi + tambahan untuk
konteks Hostinger.

Bagian 1: Pengujian otomatis (Pest). 18 skenario minimum sesuai dokumen
asli, plus TAMBAHAN:
- Test: kupon status kembali active setelah void
- Test: konsinyasi tidak buat jurnal saat terima
- Test: retur pasca-tutup-sesi WAJIB non-tunai
- Test: receivable_limit menahan kredit di atas batas

Bagian 2: Keamanan. Sesuai dokumen asli.

Bagian 3: Optimasi. Sesuai dokumen asli + catatan shared hosting:
- Cache config, route, view (WAJIB di production)
- OPCache config di php.ini
- No Redis: pakai file/database cache
- Vite build production: minify, tree-shake

Bagian 4: DEPLOY HOSTINGER (tambahan khusus).

Langkah deploy Hostinger:
1. Beli hosting Premium/Business + domain skillagemart.com
2. Aktifkan SSL Let's Encrypt (gratis, otomatis di panel)
3. Set PHP version → 8.3, ekstensi wajib aktif
4. Upload via SSH atau File Manager
5. Struktur folder Hostinger:
   /home/username/domains/skillagemart.com/
   ├── public_html/  ← isi folder /public Laravel (rename ke public_html)
   └── app/          ← isi Laravel lainnya (satu level di atas public_html)
6. Edit index.php di public_html:
   require __DIR__.'/../app/vendor/autoload.php';
   $app = require_once __DIR__.'/../app/bootstrap/app.php';
7. Copy .env.production, generate APP_KEY, isi DB credentials Hostinger
8. Jalankan lewat SSH:
   php artisan migrate --force
   php artisan config:cache route:cache view:cache
   npm run build (di local, upload public/build)
9. Cron di Hostinger cPanel:
   * * * * * cd /home/username/domains/skillagemart.com/app && php artisan schedule:run >> /dev/null 2>&1
10. Test smoke: login, kasir, laporan

Bagian 5: Dokumentasi (README, panduan kasir, panduan admin, ERD)

Bagian 6: Seeder demo (70 santri, 100 produk, 30 hari transaksi)
```

**Verifikasi manual:**
- [ ] Semua test Pest hijau
- [ ] Situs live di https://skillagemart.com
- [ ] SSL A+ di ssllabs.com
- [ ] Test kasir end-to-end di production
- [ ] Backup harian jalan lewat cron

```
commit dengan pesan "Fase 18: pengujian, keamanan, deploy Hostinger"
```

---

## MENGHEMAT KUOTA

| Cara | Penjelasan |
|---|---|
| `/usage` di awal sesi | Lihat apa yang paling menyerap kuota |
| `/compact` di tengah sesi | Sebelum konteks menumpuk |
| Satu fase satu sesi | Jangan menyambung fase baru di sesi lama |
| Panggil satu file saja | `@prompts/fase-08.md`, bukan gabungan |
| Extended thinking hemat | Hanya Fase 8, 10, 13, 18 |
| Commit tiap fase | Bila harus mengulang, tidak dari nol |
| 9Router combo fallback | Kalau tier 1 habis, otomatis tier 2 |

---

## KALAU SESI TERPUTUS DI TENGAH FASE

Buka sesi baru, sebutkan sampai mana. Contoh:

```
Fase 8 terputus. Yang sudah selesai: migration sales & sale_items,
model, enum, SaleService::addItem() dan updateQty().

Lanjutkan dari SaleService::complete() dan komponen React Kasir.tsx
sesuai @prompts/fase-08.md dengan aturan translasi @README-v2.md.
Jangan mengulang yang sudah ada — periksa dulu file yang sudah dibuat.
```

---

*Total 21 sesi coding + 7 sesi pre-coding = 28 sesi. Realistis: 3-6 bulan
solo, tergantung intensitas.*
