# SPEC.md — Spesifikasi Skillage Mart POS

Disintesis dari `docs/CONTEXT.md`, `docs/adr/*.md`, `docs/README-v2.md`,
`docs/CATATAN-PERBAIKAN.md`, dan `PROMPT-POS-SKILLAGE-MART.md` (isi asli
Fase 1–18, tersimpan di proyek `skillage-mart`). Dokumen ini adalah
**single source of truth** — tidak menciptakan requirement baru, hanya
merangkum keputusan yang sudah ada.

---

## 1. Ringkasan Eksekutif

Skillage Mart POS adalah aplikasi Point of Sale berbasis web untuk
minimarket SMK Skill Village Islamic School (Jonggol, Kabupaten Bogor),
dibangun dengan Laravel 12 + Inertia.js + React 18/TypeScript (ADR-0001),
melayani tiga area — storefront katalog publik, portal wali santri untuk
top-up dan pemantauan saldo, serta panel admin/kasir untuk operasi
minimarket penuh (kasir, master data, stok berlapis FEFO, akuntansi
double-entry, dan pelaporan) — dengan santri sebagai pembeli utama yang
membayar memakai saldo deposit lewat kartu anggota barcode, dan target
deploy shared hosting Hostinger (ADR-0008).

---

## 2. Aktor & Peran

Lihat `docs/CONTEXT.md` § Aktor untuk tabel lengkap istilah UI ↔ kode.
Ringkasan kewenangan:

| Role | Kasir | Master | Stok | Beli | Kas | Jurnal | Laporan | Anggota | Setting |
|---|---|---|---|---|---|---|---|---|---|
| owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| admin | ✓ | ✓ | ✓ | ✓ | ✓ | lihat | ✓ | ✓ | ✓ |
| supervisor | ✓ | lihat | approve | lihat | lihat | — | penjualan | lihat | — |
| cashier | ✓ | — | lihat | — | sesi | — | sesi sendiri | lihat | — |
| warehouse | — | produk | ✓ | ✓ | — | — | stok | — | — |
| treasurer | — | — | lihat | lihat | ✓ | ✓ | keuangan | lihat | — |
| guardian | — | — | — | — | — | — | — | anaknya | — |

**Kewenangan eksklusif owner:** hapus piutang (`receivable.delete`,
>90 hari) · penyesuaian saldo · tutup buku · reset sistem · lihat HPP &
margin · approve selisih opname besar.

Otorisasi tindakan sensitif (void, ubah harga, diskon di atas batas)
lewat PIN supervisor: `AuthorizationService::requestOverride()`.

---

## 3. Domain Utama

Mengikuti `docs/CONTEXT.md` — kamus istilah baku untuk: Uang & Saldo
(deposit sebagai kewajiban, ledger append-only — ADR-0003), Transaksi
(Sale, Void, Retur, Sesi Kasir), Persediaan (Stock Layer, FEFO — ADR-0004,
Konsinyasi model murni — ADR-0006), Diskon (prioritas 3 tahap, ISO
days_of_week), Kredit Anggota (`receivable_limit` — ADR-0005), Akuntansi
(jurnal double-entry seimbang wajib), dan Storefront/Portal Wali
(ADR-0009).

---

## 4. Aturan Bisnis Kritis (Tidak Boleh Dilanggar)

**Uang & Saldo**
1. Nominal uang = BIGINT rupiah penuh, tanpa desimal.
2. Saldo deposit hanya lewat `DepositService::record()` dengan
   `lockForUpdate()` + `idempotency_key` wajib.
3. Deposit dicatat sebagai kewajiban (2-1200), bukan pendapatan (ADR-0003).
4. Refund mengikuti metode bayar asal — tidak bisa jadi tunai.
5. Retur pembelian mengurangi hutang, bukan menambah kas (bila kredit).

**Stok**
6. Konsumsi stok hanya lewat `StockService::consume()` dengan FEFO
   (ADR-0004).
7. Retur mengembalikan ke layer asal via `stock_layer_consumption_id`,
   bukan bikin layer baru.
8. `system_qty` opname dibekukan saat status → `counting` (blind count).
9. Konsinyasi = model murni, tidak ada jurnal saat terima (ADR-0006).

**Transaksi**
10. Nomor nota tidak pernah dipakai ulang, termasuk yang di-void.
11. Void hanya saat sesi masih terbuka. Setelah tutup, wajib Retur, dan
    refund wajib non-tunai bila sesi asal sudah tutup (ADR-0007).
12. Harga di nota di-snapshot, tidak diambil dari master saat cetak ulang.
13. Sesi tertutup tidak bisa dibuka kembali — koreksi lewat jurnal.

**Diskon**
14. Harga akhir per item tidak pernah di bawah HPP.
15. Prioritas diskon 3 tahap wajib.
16. `days_of_week` promo pakai konvensi ISO (1=Senin, 7=Minggu).

**Kredit Anggota**
17. Tidak ada `allow_negative`. Di atas saldo → Receivable via metode
    Kredit, dibatasi `receivable_limit` (ADR-0005).

**Kupon**
18. Void nota → status kupon kembali 'active', `is_reverted` = true.

**Akuntansi**
19. Setiap jurnal harus seimbang (D = K), exception bila tidak.
20. Setiap operasi tulis kritis menerima `idempotency_key`.

**Storefront**
21. Storefront tidak menampilkan angka stok — hanya badge Tersedia/Habis.
22. Storefront tidak menampilkan HPP/margin.
23. Produk `is_visible_public = false` dilarang muncul di storefront.

**Online-specific**
24. Session cookie: `SameSite=Lax`, `Secure` di production, `HttpOnly`.
25. Semua endpoint pengubah data anggota/saldo/pembayaran wajib
    `idempotency_key` (daftar endpoint di `CATATAN-PERBAIKAN.md` §
    "Perbaikan Lintas-Fase").
26. Backup DB harian offsite (Backblaze B2), retensi 30/90 hari (ADR-0008).
27. Rate limit `/wali/*` login: 5x/menit per HP.

---

## 5. Batasan Teknis

- **Stack:** Laravel 12 (PHP 8.2+) · MySQL 8 (ADR-0002) · Inertia.js v2 ·
  React 18/19 + TypeScript strict · Vite · Tailwind v4 · shadcn/ui (Radix)
  (ADR-0001).
- **Deploy:** Shared hosting Hostinger (ADR-0008) — tidak ada Redis, tidak
  ada queue worker/Supervisor (queue via cron), tidak ada websocket/Reverb.
- **Performa:** layar kasir < 800ms p95 untuk 30 concurrent user (uji
  `k6`/`wrk` di Fase 18).
- **Keamanan:** rate limit login (5x/menit/IP), PIN member (3x → kunci 15
  menit), HTTPS mandatory di produksi, CSP header, audit log wajib (IP,
  user agent, action, before/after), 2FA opsional untuk owner/admin/
  treasurer (Laravel Fortify).
- **Tidak boleh dipakai:** Filament/Nova/Backpack/admin panel package
  lain, Livewire (diganti Inertia+React — ADR-0001), Blade sebagai layout
  utama (kecuali root template/struk PDF/email), Redis, Websocket/Reverb.

---

## 6. Peta Modul

Sumber: `PROMPT-POS-SKILLAGE-MART.md` (isi asli Fase 1–18, di-translasi ke
Inertia+React per `README-v2.md` § "ATURAN TRANSLASI"), ditambah 2 fase
baru dari v2.

| Fase | Nama | Target |
|---|---|---|
| 0 | Fondasi Proyek | Kerangka aplikasi berjalan, layout 5 area siap. **[SELESAI]** |
| 1 | Autentikasi, Role & Pengguna | Login berfungsi, 7 role dengan izin granular, CRUD pengguna |
| 2 | Master Data | Produk siap dijual, multi-barcode & konversi satuan |
| 3 | Anggota & Kartu | Santri terdaftar, kartu barcode tercetak massal |
| 4 | Deposit & Saldo | Top-up, ledger saldo anti double-spend, rekonsiliasi harian |
| 5 | Inventory & Stock Layer (FEFO) | Stok berlapis, HPP akurat, kartu stok lengkap |
| 6 | Pembelian, Konsinyasi & Hutang | PO, penerimaan barcode, konsinyasi, hutang bercicilan |
| 7 | Sesi Kasir & Kas | Buka-tutup sesi, kas laci, drop cash, selisih terkontrol |
| 8 | Layar Kasir (POS) | Kasir cepat, scan barcode, hold/recall, hotkey |
| 9 | Pembayaran Multi-Metode | Split payment, deposit+PIN, QRIS, MDR, kredit, potong gaji |
| 10 | Diskon & Promo | 11 jenis promo dengan aturan prioritas tegas |
| 11 | Retur, Void & Koreksi | Pembalikan transaksi utuh — stok, saldo, kupon, poin, jurnal |
| 12 | Stock Opname, Transfer & Penyesuaian | Opname terkunci dengan blind count & alur persetujuan |
| 13 | Akuntansi: COA, Jurnal & Buku Besar | Setiap transaksi otomatis berjurnal, laporan keuangan terbit |
| 14 | Laporan | 20 laporan siap cetak & ekspor |
| 15 | Dashboard & Analitik | Dashboard per-role dengan statistik, grafik, panel perhatian |
| 16 | Portal Wali & Notifikasi | Login HP+password, lihat saldo & riwayat anak, ajukan top-up |
| 17 | Pengaturan Sistem | Backup nyata (mysqldump ke B2), konfirmasi bahaya ketat |
| 18 | Pengujian, Keamanan & Penyiapan | Test suite, hardening, deploy Hostinger |
| 19 | Storefront Publik *(baru)* | Katalog produk publik, tanpa checkout online (ADR-0009) |
| UI-01 | Fondasi UI *(baru)* | Konsolidasi 45 halaman → 16 menu, navigasi permission-aware |

---

## 7. Kriteria Penerimaan per Modul

Kriteria rinci per modul (per-tiket) disusun terpisah di
`docs/tickets/` pada sesi pre-03 lanjutan — **belum dikerjakan di
dokumen ini** (lihat Non-Goals di bawah). Kriteria tingkat-fase mengikuti
kolom "Target" pada tabel Peta Modul § 6, diverifikasi lewat checklist
manual (backend: artisan/tinker, frontend: type-check/lint/build,
visual: browser) seperti dicontohkan di `fase-00-v2.md` § "CHECKLIST
VERIFIKASI".

---

## 8. Non-Goals

Berikut yang **secara eksplisit BUKAN** scope MVP:

- ❌ Belanja online (checkout via storefront) — hanya katalog
- ❌ Sistem pengantaran barang ke asrama atau rumah wali
- ❌ Payment gateway otomatis untuk top-up (ADR-0010 — Fase 19+, tidak MVP)
- ❌ Multi-tenant / multi-sekolah — hanya Skillage Mart, satu outlet
- ❌ Aplikasi mobile native — hanya web responsif
- ❌ Sistem POS untuk warung/kios di luar Skillage Mart
- ❌ Integrasi timbangan digital (produk curah)
- ❌ Integrasi mesin EDC bank real (nomor approval diinput manual)
- ❌ Loyalty program tingkat lanjut (tier, gamification)
- ❌ Manajemen SDM / payroll penuh (hanya potong gaji sederhana di Fase 9)
- ❌ Dokumentasi pre-coding penuh (`docs/tickets/` 100–130 tiket individual)
  di sesi ini — ditunda ke sesi lanjutan sesuai keputusan cakupan pre-03

---

## 9. Referensi ADR

| ADR | Judul |
|---|---|
| [0001](adr/0001-inertia-react-bukan-livewire.md) | Inertia + React, menggantikan rencana asli Livewire |
| [0002](adr/0002-mysql-8-bukan-postgresql.md) | MySQL 8, bukan PostgreSQL |
| [0003](adr/0003-deposit-sebagai-kewajiban.md) | Deposit sebagai kewajiban akun, bukan pendapatan |
| [0004](adr/0004-stok-fefo-layer.md) | Stok pakai FEFO Layer, bukan average cost sederhana |
| [0005](adr/0005-kredit-anggota-bukan-allow-negative.md) | Sistem Kredit Anggota via `receivable_limit`, bukan `allow_negative` |
| [0006](adr/0006-konsinyasi-model-murni.md) | Konsinyasi model murni (barang bukan aset mart) |
| [0007](adr/0007-retur-pasca-tutup-sesi-non-tunai.md) | Retur pasca-tutup-sesi wajib refund non-tunai |
| [0008](adr/0008-shared-hosting-hostinger.md) | Deploy shared hosting Hostinger, migrasi VPS setelah bulan ke-6 |
| [0009](adr/0009-storefront-stack-sama-route-publik.md) | Storefront pakai stack sama, route publik terpisah |
| [0010](adr/0010-payment-gateway-ditunda.md) | Payment gateway ditunda ke Fase 19+, MVP hanya manual top-up |

---

*SPEC.md dikunci setelah ditinjau. Perubahan scope wajib PR + diskusi
eksplisit, dan dicatat sebagai revisi ADR bila mengubah keputusan
arsitektur.*
