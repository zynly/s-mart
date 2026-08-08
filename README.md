<p align="center">
  <img src="public/logo/logo2.png" width="160" alt="Skillage Mart Logo" />
</p>

<h1 align="center">🛒 Skillage Mart (S-Mart)</h1>

<p align="center">
  <strong>Enterprise Retail Point of Sale (POS), Inventory & Double-Entry Accounting ERP System</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/Laravel-11.x-FF2D20?style=flat-square&logo=laravel" alt="Laravel 11"></a>
  <a href="#"><img src="https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react" alt="React 18"></a>
  <a href="#"><img src="https://img.shields.io/badge/Inertia.js-2.x-9553E9?style=flat-square&logo=inertia" alt="Inertia.js"></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript" alt="TypeScript"></a>
  <a href="#"><img src="https://img.shields.io/badge/TailwindCSS-3.x-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS"></a>
  <a href="#"><img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql" alt="PostgreSQL"></a>
  <a href="#"><img src="https://img.shields.io/badge/License-MIT-green.style=flat-square" alt="License MIT"></a>
</p>

---

## 📌 Tentang Skillage Mart

**Skillage Mart (S-Mart)** adalah aplikasi ERP & Point of Sale (POS) ritel modern berstandar enterprise yang dirancang untuk mengelola operasional toko, minimarket, serta unit usaha koperasi secara terintegrasi. 

S-Mart menggabungkan **Kasir Kas POS**, **Manajemen Stok Berbasis FEFO**, **Keanggotaan & Portal Wali**, hingga **Sistem Akuntansi Berpasangan (Double-Entry Accounting)** secara otomatis *real-time*.

---

## 🔥 Fitur Utama Modul

### 💻 1. Kasir / Point of Sale (POS)
- **Pencarian Instant & Scanner**: Pencarian cepat nama barang, SKU, maupun pemindaian Barcode.
- **Multi-Metode Pembayaran**: Tunai, QRIS, Transfer Bank, Kartu Debit, Saldo Deposit Anggota, hingga Kredit Tempo (Bon Kasbon).
- **Manajemen Sesi Kasir**: Buka/Tutup sesi kasir dengan verifikasi modal awal dan rekonsiliasi uang fisik laci.
- **Struk & Nota Cetak**: Cetak struk belanja thermal/nota cetak otomatis.

### 👥 2. Keanggotaan & Portal Wali
- **Manajemen Anggota**: Cetak Kartu Anggota dengan Barcode/QR Code bawaan.
- **Sistem Saldo Deposit**: Fitur Top-Up saldo, Penarikan, dan Riwayat Mutasi Deposit.
- **Portal Wali (Wali Santri/Pelanggan)**: Akun portal khusus wali untuk melakukan pengajuan top-up saldo dan memantau transaksi.
- **Poin Reward & Promo**: Pengumpulan poin reward belanja, promo diskon, dan kupon voucher.

### 📦 3. Persediaan & Stok (FEFO Batch Inventory)
- **Pelacakan Layer FEFO**: *First-Expired, First-Out* otomatis pada barang ber-kedaluwarsa.
- **Barang Titipan (Konsinyasi)**: Manajemen stok konsinyasi dari supplier dengan pembagian komisi mart dan perhitungan otomatis.
- **Stok Opname & Adjustment**: Rekonsiliasi fisik stok dengan penyesuaian otomatis ke jurnal akuntansi.
- **Transfer Stok**: Pengiriman dan penerimaan mutasi stok antar outlet/gudang.
- **Peringatan Stok Kritis**: Notifikasi otomatis untuk stok minimal dan barang mendekati kedaluwarsa.

### 🚚 4. Pembelian & Supplier
- **Purchase Order (PO) & Penerimaan Barang**: Pembelian kredit/tunai dengan pembaruan otomatis ke persediaan.
- **Hutang Usaha (Supplier)**: Pencatatan utang otomatis dengan *Aging Analysis* (Umur Hutang 0–30, 31–60, 61–90, >90 hari).

### 📊 5. Akuntansi Berpasangan (Double-Entry ERP)
- **Bagan Akun (COA)**: Struktur akun hirarki bertingkat (*Tree View*) dengan pencarian dan filter tipe akun.
- **Jurnal Umum Otomatis**: Otomatisasi jurnal berpasangan dari setiap transaksi POS, Pembelian, Deposit, Retur, dan Kas.
- **Buku Besar (General Ledger)**: Pemilih akun modern (*Searchable Combobox*) dengan kontrol tinggi dan mutasi saldo berjalan.
- **Laporan Finansial Executive**:
  - 📈 **Laba Rugi (Profit & Loss)**: Dilengkapi KPI Cards di bagian atas (*Pendapatan, HPP, Laba Kotor, Laba Bersih*).
  - ⚖️ **Neraca (Balance Sheet)**: Perbandingan Aktiva vs Pasiva dengan indikator *Keseimbangan Jurnal (Balanced)*.
  - 🧾 **Neraca Saldo (Trial Balance)** & **Periode Akuntansi (Tutup Buku)**.

### 📈 6. Laporan & Analitik (15 Modul Laporan)
- **15 Modul Laporan Komprehensif**: Penjualan per Produk, Penjualan per Kasir, Metode Bayar, Arus Kas, Kartu Stok, Aging Piutang & Hutang.
- **Ekspor Excel (.xlsx) Native**: Dilengkapi *Auto-Width Column*, Header Navy, dan Format Angka Native (`#,##0`) yang bisa langsung di-rumus `=SUM()`.
- **Pratinjau & Cetak PDF Dokumen Resmi**: Kop Surat Resmi Mart, Pilihan Kertas (A4 / F4 Folio), dan Blok Tanda Tangan Audit Resmi (*Dibuat, Diperiksa, Disetujui*).

### 🔒 7. Keamanan & Akses
- **Role-Based Access Control (RBAC)**: Otorisasi multi-peran (*Owner, Admin, Kasir, Wali*) menggunakan Spatie Permission.
- **Audit Trail Activity Log**: Catatan riwayat aktivitas pengguna lengkap dengan perlindungan sensor data sensitif.

---

## 🛠️ Teknologi & Stack Digunakan

| Kategori | Teknologi |
| :--- | :--- |
| **Backend Framework** | [Laravel 11.x](https://laravel.com/) (PHP 8.2+) |
| **Frontend Engine** | [React 18](https://react.dev/) via [Inertia.js v2](https://inertiajs.com/) |
| **Language & Typing** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling & UI** | [Tailwind CSS v3](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/) |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) / MySQL 8 |
| **Excel Export** | [Maatwebsite Excel](https://laravel-excel.com/) |
| **Icon Set** | [Lucide React](https://lucide.dev/) |
| **Build Tool** | [Vite](https://vitejs.dev/) & `pnpm` |

---

## 🚀 Panduan Instalasi Lokal

### 1. Prasyarat Sistem
- PHP >= 8.2 (dengan ekstensi `pdo_pgsql`/`pdo_mysql`, `gd`, `bcmath`, `mbstring`, `zip`)
- Node.js >= 18.x & `pnpm`
- Composer >= 2.x
- Database PostgreSQL 16 / MySQL 8

### 2. Langkah Instalasi

```bash
# 1. Clone repositori
git clone https://github.com/zynly/s-mart.git
cd s-mart

# 2. Install dependensi PHP & Node.js
composer install
pnpm install

# 3. Salin file lingkungan (.env)
cp .env.example .env

# 4. Generate Application Key
php artisan key:generate

# 5. Konfigurasi Database di .env
# DB_CONNECTION=pgsql
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=s_mart
# DB_USERNAME=postgres
# DB_PASSWORD=secret

# 6. Jalankan Migrasi Database & Seeder Master Data
php artisan migrate --seed

# 7. Jalankan server pengembang (Development Mode)
# Terminal 1: Laravel Backend
php artisan serve

# Terminal 2: Vite Frontend
pnpm dev
```

---

## 📦 Build untuk Produksi

```bash
# Kompilasi aset frontend untuk produksi
pnpm build

# Optimize Laravel cache
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## 📄 Lisensi

Proyek ini dilindungi di bawah lisensi [MIT License](LICENSE).
