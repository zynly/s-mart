# REVISI R1 — HASIL UJI COBA APLIKASI

> **Dokumen ini adalah temuan nyata dari pengujian aplikasi oleh Ziyad,**
> **dengan klarifikasi yang sudah dijawab.**
> Berisi 3 kategori: **BUG** (harus diperbaiki), **PERUBAHAN** (ubah perilaku
> yang sudah ada), dan **BARU** (fitur yang belum ada).

## Keputusan yang sudah dikunci

Semua yang perlu klarifikasi sudah dijawab Pak:

1. **"Pembelian tidak boleh melebihi stok outlet"** = kasir tidak bisa
   menjual barang yang stoknya tidak ada di outletnya (bukan retur, bukan
   transfer). Diterapkan di § 4.6/4.7.
2. **Kartu member** punya palet warna sendiri (`#07395A`), tidak
   diseragamkan dengan aplikasi. Diterapkan di § 9.
3. **Multi-outlet — versi ringan**: pasang `outlet_id` dan global scope
   di semua model, TAPI belum bangun outlet switcher dan filter laporan
   rumit. Itu menyusul saat outlet kedua ada. Diterapkan di § 1.
4. **Khaki 70% dikecualikan di layar kasir** — layar kasir tetap
   dominan navy gelap seperti mockup. Diterapkan di § 5.
5. **Data mockup kasir** hanya placeholder — pakai data produk asli
   saat implementasi.
6. **Notifikasi wali** hanya dalam aplikasi (lonceng), belum WhatsApp.
   Diterapkan di § 8.2.
7. **Reset password wali** lewat pertanyaan keamanan: NIS + nama anak +
   tanggal lahir. Diterapkan di § 8.1.

**Cara pakai:** ini bukan satu sesi. Pecah jadi 8 sesi sesuai bagian di
§ 0 (Peta Sesi). Satu bagian = satu sesi Claude Code.

---

## PROMPT PEMBUKA (SALIN DI AWAL SETIAP SESI)

```
Sebelum mengerjakan apa pun, BACA DULU dokumen berikut secara berurutan
supaya kamu paham konteks proyek dan tidak membuat keputusan yang
bertentangan dengan yang sudah ditetapkan:

1. @README-v2.md
   → stack, aturan kode, struktur folder, aturan translasi

2. @CATATAN-PERBAIKAN.md
   → semua keputusan yang sudah dikunci (konsinyasi murni,
     receivable_limit, retur pasca-tutup-sesi, dst)

3. @docs/CONTEXT.md
   → kamus domain: istilah UI Indonesia ↔ istilah kode Inggris

4. @docs/SPEC.md
   → spesifikasi final, termasuk Non-Goals

5. @docs/adr/
   → semua ADR (architectural decision record)

6. @REVISI-R1.md  (dokumen ini)
   → temuan hasil uji coba yang harus diperbaiki

7. Fase yang relevan dengan bagian yang dikerjakan
   (@fase-00-v2.md sampai @fase-19-storefront-publik.md)

Setelah membaca, konfirmasi ke saya dengan menyebutkan:
- Berapa ADR yang kamu temukan
- Apa keputusan yang sudah dikunci soal konsinyasi
- Apa keputusan soal kredit anggota (allow_negative vs receivable_limit)

Baru setelah itu kerjakan bagian yang saya sebutkan.

ATURAN SELAMA MENGERJAKAN REVISI INI:
- JANGAN mengubah migration lama. Bila butuh kolom baru,
  buat migration TAMBAHAN.
- JANGAN mengubah struktur yang sudah berjalan kecuali diminta
  eksplisit di dokumen ini.
- Setiap perubahan UI wajib memakai token warna
  (bg-surface, text-content), bukan warna langsung.
- Setiap tabel/daftar baru wajib memakai <DataTable> yang sudah ada.
- Commit di akhir setiap bagian.
```

---

## § 0 — PETA SESI

| Sesi | Bagian | Isi | Berat |
|---|---|---|---|
| R1-1 | § 1 | Multi-Outlet & Hak Akses | 🔴 Berat |
| R1-2 | § 2 | Identitas Visual (3 warna primer) | 🟡 Sedang |
| R1-3 | § 3 | Perbaikan UI Umum | 🟡 Sedang |
| R1-4 | § 4 | Produk & Stok | 🟢 Ringan |
| R1-5 | § 5 | Layar Kasir (POS) — desain ulang | 🔴 Berat |
| R1-6 | § 6 | Deposit & Verifikasi 2 Langkah | 🟡 Sedang |
| R1-7 | § 7 | Laporan, Pembelian, Sesi Kasir | 🟡 Sedang |
| R1-8 | § 8 | Portal Wali & Dashboard | 🟢 Ringan |
| R1-9 | § 9 | Desain Kartu Member | 🟢 Ringan |

**Kerjakan berurutan.** § 1 harus selesai lebih dulu karena mengubah
fondasi hak akses yang dipakai semua bagian lain.

---

## § 1 — MULTI-OUTLET (VERSI RINGAN) & HAK AKSES 🔴

**Ini perubahan fundamental. Kerjakan pertama.**

### 1.0 Ruang lingkup versi ringan

Karena saat ini Skillage Mart baru **satu outlet** dan belum ada rencana
konkret menambah, kita bangun fondasinya sekarang **tanpa** UI switcher
dan filter laporan yang rumit. Yang dikerjakan:

**Dikerjakan sekarang:**
- Kolom `outlet_id` di semua model transaksi (sebagian sudah ada,
  pastikan konsisten)
- Trait `BelongsToOutlet` dengan global scope
- Auto-fill `outlet_id` saat create dari `active_outlet_id` atau outlet
  primary user
- Tabel `outlet_user` untuk relasi banyak-ke-banyak (siap untuk masa
  depan)
- Kas & laci kasir per outlet
- Halaman Kelola Laci

**DITUNDA sampai outlet kedua benar-benar ada:**
- Dropdown outlet switcher di header
- Filter outlet di halaman laporan
- Halaman kelola penempatan user–outlet (owner)
- Opsi "Semua Outlet" (gabungan) di laporan

Alasan: membangun UI multi-outlet penuh untuk satu outlet = pekerjaan
sia-sia yang justru mempersulit UX. Tapi fondasi datanya wajib sekarang
supaya nanti tidak perlu migrasi besar.

### 1.1 Masalah yang ditemukan

Saat ini data belum benar-benar terpisah per outlet — trait
`BelongsToOutlet` belum konsisten dipasang. Kas dan laci kasir juga
belum tegas per outlet.

### 1.2 Aturan baru yang harus berlaku

**Penempatan user ke outlet:**

- **Owner** yang mengatur penempatan user di outlet mana
- **Owner** → menaungi SEMUA outlet, bisa lihat & filter semua
- **Admin** → boleh punya LEBIH DARI SATU outlet
- **Role lain** (supervisor, cashier, warehouse, treasurer) → HANYA SATU outlet

**Konsekuensi data:**

- Semua data yang tampil WAJIB tertaut dengan outlet user
- Transaksi otomatis dinaungi outlet user yang sedang login
- **Tidak bisa menjual barang yang bukan dari outletnya**
- Stok yang tampil hanya stok outlet user tersebut

### 1.3 Perubahan struktur data

Ubah relasi user–outlet dari satu-ke-satu menjadi banyak-ke-banyak:

```php
// Migration BARU (jangan ubah migration users lama)
Schema::create('outlet_user', function (Blueprint $t) {
    $t->id();
    $t->foreignId('user_id')->constrained()->cascadeOnDelete();
    $t->foreignId('outlet_id')->constrained()->cascadeOnDelete();
    $t->boolean('is_primary')->default(false);
    $t->timestamps();
    $t->unique(['user_id', 'outlet_id']);
});
```

Kolom `users.outlet_id` yang lama:
- **Jangan dihapus** (untuk kompatibilitas)
- Isi sebagai outlet primary
- Tambahkan komentar deprecated

Validasi di aplikasi:
- Role selain owner & admin → maksimal 1 baris di `outlet_user`
- Owner → tidak perlu baris sama sekali (akses semua via bypass)
- Admin → boleh banyak baris

### 1.4 Global scope wajib

Perkuat trait `BelongsToOutlet` yang sudah ada:

```php
protected static function bootBelongsToOutlet(): void
{
    static::addGlobalScope('outlet', function (Builder $builder) {
        $user = auth()->user();
        if (!$user) return;

        // Owner bypass — lihat semua
        if ($user->hasRole('owner')) return;

        // Bila ada filter outlet aktif dari session
        if ($outletId = session('active_outlet_id')) {
            $builder->where('outlet_id', $outletId);
            return;
        }

        // Fallback: semua outlet yang dimiliki user
        $builder->whereIn('outlet_id', $user->outlets->pluck('id'));
    });

    static::creating(function ($model) {
        if (empty($model->outlet_id)) {
            $model->outlet_id = session('active_outlet_id')
                ?? auth()->user()?->primaryOutlet()?->id;
        }
    });
}
```

Pasang trait ini pada SEMUA model transaksi:
`Sale`, `SaleReturn`, `Purchase`, `PurchaseReturn`, `StockLayer`,
`StockMovement`, `Stock`, `CashierSession`, `CashTransaction`,
`CashAccount`, `DepositTransaction`, `StockOpname`, `Receivable`,
`Debt`, `Journal`

### 1.5 Pemilih outlet — DITUNDA

Untuk versi ringan ini, **jangan bangun** dropdown pemilih outlet di
header. Cukup tampilkan nama outlet aktif sebagai label statis di
sidebar footer:

```
Outlet: Skillage Mart
```

`session('active_outlet_id')` tetap ada dan diisi otomatis dari:
1. Outlet primary user (dari `outlet_user.is_primary=true`), atau
2. Kolom lama `users.outlet_id` bila belum ada baris di `outlet_user`

Ini memungkinkan owner dan admin nanti mendapatkan switcher tanpa
mengubah struktur data.

Struktur controller yang akan dibangun **wajib** membaca dari
`session('active_outlet_id')`, bukan hardcode outlet pertama. Ini
supaya nanti tinggal tambah UI switcher, tidak perlu refactor
controller.

### 1.6 Kas per outlet

**Masalah:** saat ini satu kas dipakai semua outlet.

**Perbaikan:**
- Setiap `cash_account` WAJIB punya `outlet_id` (sudah ada, pastikan diisi)
- Laci kasir (`is_drawer = true`) juga per outlet
- Saat buka sesi kasir, hanya laci milik outlet user yang muncul
- Buku kas hanya menampilkan akun outlet user

### 1.7 JAWABAN — Sistem Laci Kasir

> **Pertanyaan Pak:** "Bagaimana sistem laci kasir ini? Apakah beda
> penyimpanan? Semisal ada 5 kasir, berarti mereka berbagi kasir yang
> sama gitu?"

**Konsep laci (drawer) dalam POS:**

Satu `cash_account` dengan `is_drawer = true` = **satu laci uang fisik
yang nyata**. Bukan penyimpanan digital, tapi merepresentasikan laci
kayu/besi tempat uang tunai disimpan.

**Tiga skenario yang mungkin di Skillage Mart:**

**Skenario A — Satu laci, kasir bergantian (paling umum untuk sekolah)**
```
Outlet: Skillage Mart
└── Laci 1 (satu laci fisik)
    ├── 07:00–12:00  Sesi Budi   (modal awal 200rb)
    ├── 12:00–17:00  Sesi Ahmad  (serah terima dari Budi)
    └── 17:00–21:00  Sesi Siti   (serah terima dari Ahmad)
```
Kasir bergantian pakai laci yang sama. Perpindahan lewat menu
**Serah Terima Shift** — sesi Budi ditutup, sesi Ahmad dibuka dengan
`opening_cash` = `actual_cash` Budi. Uang fisik tidak dihitung ulang.

**Skenario B — Banyak laci, satu kasir per laci (toko besar)**
```
Outlet: Skillage Mart
├── Laci 1 → Sesi Budi   (modal 200rb)
├── Laci 2 → Sesi Ahmad  (modal 200rb)
└── Laci 3 → Sesi Siti   (modal 200rb)
```
Tiga komputer kasir, tiga laci fisik terpisah. Masing-masing punya
sesi sendiri, tutup sendiri, hitung sendiri.

**Skenario C — Campuran**
Beberapa laci, tapi jam ramai ditambah, jam sepi dikurangi.

**Yang berlaku di sistem sekarang:**
- Satu user = maksimal satu sesi terbuka
- Satu laci = maksimal satu sesi terbuka (tidak boleh 2 kasir di laci sama)
- 5 kasir bisa: (a) bergantian di 1 laci, atau (b) 5 laci terpisah

**Rekomendasi saya untuk Skillage Mart:**
Mulai dengan **1 laci**. Kasir bergantian lewat Serah Terima. Ini paling
mudah dikontrol dan selisih mudah dilacak. Tambah laci hanya kalau
antrian jam istirahat benar-benar tidak tertangani satu kasir.

**Yang perlu ditambahkan ke sistem (belum ada):**
- Halaman **Kelola Laci** di `/admin/kas` tab Akun Kas — owner bisa
  tambah/kurangi laci per outlet
- Validasi: laci yang sedang dipakai sesi terbuka tidak bisa dinonaktifkan

### 1.8 Checklist § 1

**Fondasi data:**
- [ ] Tabel `outlet_user` dibuat, seeder mengisi data existing
- [ ] Trait `BelongsToOutlet` terpasang di semua model transaksi
      (Sale, SaleReturn, Purchase, PurchaseReturn, StockLayer,
      StockMovement, Stock, CashierSession, CashTransaction, CashAccount,
      DepositTransaction, StockOpname, Receivable, Debt, Journal)
- [ ] Auto-fill `outlet_id` saat create dari `session('active_outlet_id')`
- [ ] Global scope aktif kecuali untuk owner (bypass)
- [ ] `session('active_outlet_id')` terisi otomatis dari outlet primary
- [ ] Controller-controller membaca dari session, bukan hardcode

**Aturan bisnis:**
- [ ] Setiap `cash_account` punya `outlet_id` (validasi wajib)
- [ ] Laci kasir per outlet
- [ ] Kasir tidak bisa menjual barang yang stoknya tidak ada di outletnya
      (validasi di `SaleService`, bukan hanya di UI — uji via API langsung)
- [ ] Buka sesi → hanya laci outlet user yang muncul
- [ ] Halaman Kelola Laci ada, owner bisa tambah/nonaktifkan laci
- [ ] Label "Outlet: Skillage Mart" tampil di sidebar footer

**Yang DITUNDA (jangan dikerjakan sekarang):**
- Dropdown outlet switcher di header
- Halaman penempatan user–outlet (owner)
- Filter outlet di halaman laporan
- Opsi "Semua Outlet" gabungan

```
commit: "R1-1: multi-outlet, hak akses per outlet, kas per outlet"
```

---

## § 2 — IDENTITAS VISUAL: TIGA WARNA PRIMER 🟡

### 2.1 Perubahan

Sebelumnya hanya navy sebagai primer. Sekarang **tiga warna primer**
dengan dominasi **70 : 20 : 10**.

| Porsi | Warna | Peran |
|---|---|---|
| **70%** | Khaki | Warna dasar/dominan — background, permukaan besar, area netral |
| **20%** | Navy | Warna struktur — sidebar, header, tombol utama, teks penting |
| **10%** | Mustard | Aksen — highlight, badge, indikator aktif, CTA sekunder |

### 2.2 Palet lengkap

```js
// tailwind.config.js — theme.extend.colors

khaki: {
  50:  '#FAF9F5',
  100: '#F5F2EA',
  200: '#EBE5D6',
  300: '#DDD3BC',
  400: '#C9BB9A',
  500: '#B5A47D',
  600: '#9A8A65',
  700: '#7D6F51',
  800: '#5F5440',
  900: '#403930',
},

navy: {
  50:  '#F0F4FA',
  100: '#DCE5F2',
  200: '#B9CBE5',
  300: '#8AA6D1',
  400: '#5478B0',
  500: '#2E5490',
  600: '#1B3A6B',   // navy utama
  700: '#152E56',
  800: '#1B2A4A',
  900: '#0F1B33',
},

mustard: {
  50:  '#FDF9EC',
  100: '#FAF0CE',
  200: '#F4DF99',
  300: '#EBC95D',
  400: '#E0B02F',
  500: '#C9A227',   // mustard utama (gold lama)
  600: '#A8831F',
  700: '#85661A',
  800: '#634C17',
  900: '#423314',
},
```

**Catatan:** warna `gold` lama (#C9A227) menjadi `mustard.500`. Ganti semua
referensi `gold` menjadi `mustard`.

### 2.3 Token semantik yang diperbarui

```css
:root {
  /* 70% — khaki dominan */
  --bg:            250 249 245;   /* khaki-50  — latar halaman */
  --surface:       255 255 255;   /* putih     — kartu di atas khaki */
  --surface-alt:   245 242 234;   /* khaki-100 — zebra, hover */
  --border:        235 229 214;   /* khaki-200 */
  --border-strong: 221 211 188;   /* khaki-300 */

  /* 20% — navy struktur */
  --primary:       27  58 107;    /* navy-600 */
  --primary-fg:   255 255 255;
  --sidebar:       27  42  74;    /* navy-800 */
  --sidebar-fg:   220 229 242;
  --sidebar-active: 21  46  86;   /* navy-700 */
  --text:          15  27  51;    /* navy-900 */
  --text-muted:    46  84 144;    /* navy-500 */
  --text-subtle:  138 166 209;    /* navy-300 */

  /* 10% — mustard aksen */
  --accent:       201 162  39;    /* mustard-500 */
  --accent-fg:     66  51  20;    /* mustard-900 */

  /* Semantik */
  --success:       30 122  76;
  --warning:      199 119   0;
  --danger:       179  38  30;
}

.dark {
  /* 70% — khaki gelap */
  --bg:             26  24  20;   /* khaki gelap */
  --surface:        38  35  30;
  --surface-alt:    52  47  40;
  --border:         64  57  48;   /* khaki-900 */
  --border-strong:  95  84  64;   /* khaki-800 */

  /* 20% — navy */
  --primary:      138 166 209;    /* navy-300 (lebih terang di gelap) */
  --primary-fg:    15  27  51;
  --sidebar:       15  27  51;    /* navy-900 */
  --sidebar-fg:   203 213 225;
  --sidebar-active: 27  58 107;
  --text:         237 233 224;
  --text-muted:   184 176 160;
  --text-subtle:  138 130 115;

  /* 10% — mustard */
  --accent:       235 201  93;    /* mustard-300 */
  --accent-fg:     26  24  20;

  --success:       52 168 110;
  --warning:      230 150  30;
  --danger:       220  80  70;
}
```

### 2.4 Panduan penerapan 70-20-10

**Berlaku untuk:** halaman publik, portal wali, admin, storefront.
**DIKECUALIKAN:** layar kasir (`/pos`) — lihat § 2.5.

**Khaki (70%) dipakai untuk:**
- Latar belakang halaman (`bg-bg`)
- Permukaan sekunder, area kosong
- Border, garis pemisah
- Baris zebra pada tabel
- Latar hover pada item non-aktif

**Navy (20%) dipakai untuk:**
- Sidebar dan header
- Tombol primer
- Teks utama dan judul
- Ikon navigasi
- Grafik seri utama

**Mustard (10%) dipakai untuk — HEMAT, jangan berlebihan:**
- Indikator menu aktif (border kiri)
- Badge penting/urgen
- Highlight angka total di kasir
- Tombol CTA sekunder
- Aksen pada kartu statistik

### 2.5 Pengecualian: layar kasir

Layar kasir dipakai berjam-jam dengan gerakan mata cepat antar-item.
Latar khaki terang membuat mata cepat lelah dan angka total tenggelam.

**Layar kasir tetap navy-dominan** seperti mockup Pak:
- Header: navy-800 (`--sidebar`)
- Latar utama: navy sangat gelap (dark mode kasir jadi default)
- Katalog produk: kartu dengan surface terang, tapi latarnya gelap
- Panel keranjang: surface terang di atas latar gelap
- Total dan tombol BAYAR: aksen mustard sangat menonjol

Konkretnya:
- `PosLayout` selalu menerapkan class `dark` pada `<html>` saat mount,
  tanpa memandang preferensi user
- Saat keluar dari layar kasir, class `dark` dikembalikan ke preferensi
  user (dari `useThemeStore`)
- Tidak ada toggle mode terang/gelap di layar kasir

Bila kasir ingin bekerja di mode terang, itu preferensi tim yang akan
ditinjau setelah pemakaian nyata — tapi bawaannya gelap.

### 2.5 Checklist § 2

- [ ] `tailwind.config.js` punya 3 palet: khaki, navy, mustard
- [ ] Semua referensi `gold` diganti `mustard`
- [ ] Token CSS variable diperbarui (terang & gelap)
- [ ] Halaman `/uji-komponen` menampilkan ketiga palet lengkap
- [ ] Latar halaman terasa khaki (bukan putih polos, bukan biru)
- [ ] Sidebar tetap navy, terasa sebagai struktur
- [ ] Mustard hanya muncul di titik-titik aksen (hitung: tidak lebih
      dari ~10% area layar)
- [ ] Mode gelap: khaki gelap terasa hangat, bukan abu-abu dingin
- [ ] Kontras teks memenuhi WCAG AA (4.5:1) di kedua mode
- [ ] Layar kasir SELALU navy-dominan (mode gelap paksa), tidak
      terpengaruh preferensi user
- [ ] Keluar dari layar kasir → tema kembali ke preferensi user

```
commit: "R1-2: identitas visual tiga warna primer 70-20-10"
```

---

## § 3 — PERBAIKAN UI UMUM 🟡

### 3.1 Filter kolom masih memakai nama database

**Masalah:** filter menampilkan `member_id`, `created_at`,
`is_active` — terlihat seperti database, bukan aplikasi untuk manusia.

**Perbaikan:** setiap definisi kolom `DataTable` WAJIB punya label
bahasa Indonesia.

```tsx
// SEBELUM (salah)
{ accessorKey: 'member_id', header: 'member_id' }

// SESUDAH (benar)
{ accessorKey: 'member_id', header: 'Anggota',
  meta: { filterLabel: 'Anggota' } }
```

Buat satu kamus terpusat di `resources/js/Lib/labels.ts`:

```ts
export const COLUMN_LABELS: Record<string, string> = {
  // Umum
  id: 'ID',
  created_at: 'Dibuat',
  updated_at: 'Diperbarui',
  is_active: 'Status Aktif',
  reference: 'No. Referensi',
  note: 'Catatan',
  outlet_id: 'Outlet',
  user_id: 'Petugas',

  // Produk
  sku: 'Kode SKU',
  product_id: 'Produk',
  category_id: 'Kategori',
  brand_id: 'Merek',
  base_unit_id: 'Satuan Dasar',
  min_stock: 'Stok Minimum',
  max_stock: 'Stok Maksimum',
  is_expirable: 'Punya Kadaluwarsa',
  is_consignment: 'Barang Titipan',
  is_favorite: 'Produk Favorit',
  is_visible_public: 'Tampil di Katalog',

  // Anggota
  member_id: 'Anggota',
  member_number: 'No. Anggota',
  nis: 'NIS',
  class_name: 'Kelas',
  major: 'Jurusan',
  entry_year: 'Angkatan',
  balance_cache: 'Saldo',
  point_balance: 'Poin',
  receivable_limit: 'Batas Piutang',
  guardian_name: 'Nama Wali',
  guardian_phone: 'HP Wali',

  // Transaksi
  sale_date: 'Tanggal Jual',
  grand_total: 'Total',
  subtotal: 'Subtotal',
  total_discount: 'Diskon',
  paid_amount: 'Dibayar',
  change_amount: 'Kembalian',
  gross_profit: 'Laba Kotor',
  total_cost: 'Total HPP',
  cashier_session_id: 'Sesi Kasir',

  // Stok
  qty: 'Jumlah',
  qty_remaining: 'Sisa',
  unit_cost: 'HPP Satuan',
  batch_no: 'No. Batch',
  expired_at: 'Kadaluwarsa',
  received_at: 'Diterima',

  // Kas
  cash_account_id: 'Akun Kas',
  opening_cash: 'Modal Awal',
  expected_cash: 'Kas Seharusnya',
  actual_cash: 'Kas Fisik',
  difference: 'Selisih',

  // Pembelian
  supplier_id: 'Pemasok',
  purchase_date: 'Tanggal Beli',
  due_date: 'Jatuh Tempo',
  invoice_no: 'No. Faktur',
  remaining_amount: 'Sisa',
}
```

Gunakan di `DataTable`: bila `header` tidak diisi, ambil dari
`COLUMN_LABELS[accessorKey]`. Bila tetap tidak ada, tampilkan
warning di console saat development supaya ketahuan.

### 3.2 Tanda panah atas-bawah di tab mengganggu

**Masalah:** setiap tab ada ikon panah sort — mengganggu visual.

**Perbaikan:** hapus semua ikon panah dari komponen `PageTabs`.
Tab cukup teks yang bisa diklik. Indikator aktif pakai garis bawah
mustard, bukan ikon.

Panah sort **tetap ada di header tabel** (itu memang fungsinya),
tapi **tidak di tab navigasi**.

### 3.3 Scrollbar tidak menyatu dengan tema

**Perbaikan:** styling scrollbar mengikuti token warna.

```css
/* resources/css/app.css */
@layer base {
  * {
    scrollbar-width: thin;
    scrollbar-color: rgb(var(--border-strong)) transparent;
  }

  *::-webkit-scrollbar { width: 10px; height: 10px; }
  *::-webkit-scrollbar-track {
    background: transparent;
  }
  *::-webkit-scrollbar-thumb {
    background-color: rgb(var(--border-strong));
    border-radius: 6px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  *::-webkit-scrollbar-thumb:hover {
    background-color: rgb(var(--text-subtle));
  }
  *::-webkit-scrollbar-corner { background: transparent; }
}
```

### 3.4 Responsif di semua perangkat

**Perbaikan:** audit menyeluruh. Setiap halaman harus rapi di:

| Breakpoint | Lebar | Perilaku |
|---|---|---|
| Mobile | 360–639px | Sidebar jadi drawer, tabel jadi kartu, form 1 kolom |
| Tablet | 640–1023px | Sidebar drawer, tabel scroll horizontal, form 2 kolom |
| Laptop | 1024–1439px | Sidebar tetap, tabel normal |
| Desktop | ≥1440px | Sidebar tetap, konten max-w-[1600px] |

**Pola khusus tabel di mobile:** ubah jadi daftar kartu.
Buat komponen `<ResponsiveTable>` yang membungkus `DataTable`:
- `md` ke atas → tabel biasa
- di bawah `md` → kartu per baris dengan label:nilai

**Layar kasir di mobile:** tampilkan peringatan
"Layar kasir memerlukan layar minimal 1024px" — kasir memang tidak
untuk HP.

### 3.5 Pencarian global (Ctrl+K) nge-bug

**Masalah:** layar bug saat klik pencarian atau tekan Ctrl+K.

**Perbaikan:**
- Pastikan hanya SATU instance `<CommandDialog>` di seluruh app
  (taruh di `AdminLayout`, bukan di tiap halaman)
- Cegah pemasangan hotkey ganda: `useHotkeys` dengan dependency
  array yang benar
- Tutup dialog saat navigasi Inertia (`router.on('navigate', close)`)
- `preventDefault` pada Ctrl+K agar tidak bentrok pencarian browser
- Reset query saat dialog dibuka
- Batasi hasil maksimal 8 per kategori

### 3.6 Rentang tanggal: 7 menu + 2 kalender terlalu ramai

**Perbaikan — pilih alur berjenjang:**

```
Klik [Rentang Tanggal]
   ↓
Muncul daftar preset (7 pilihan):
   • Hari Ini
   • Kemarin
   • 7 Hari Terakhir
   • Minggu Ini
   • Bulan Ini
   • Bulan Lalu
   • Kustom...        ← hanya ini yang membuka kalender
   ↓ (klik Kustom)
Baru muncul 2 kalender rentang tanggal
```

Preset langsung menutup popover dan menerapkan filter.
Kalender hanya muncul saat "Kustom" dipilih.

Ubah komponen `<DateRangePicker>` sesuai alur ini.

### 3.7 Checklist § 3

- [ ] `Lib/labels.ts` dibuat, semua kolom punya label Indonesia
- [ ] Tidak ada lagi nama kolom database yang tampil ke user
- [ ] Console warning muncul saat ada kolom tanpa label (dev mode)
- [ ] Ikon panah dihapus dari tab navigasi
- [ ] Tab aktif ditandai garis bawah mustard
- [ ] Scrollbar mengikuti warna tema di mode terang & gelap
- [ ] Uji 360px, 768px, 1024px, 1440px — semua halaman rapi
- [ ] Tabel di mobile jadi kartu, bukan scroll horizontal panjang
- [ ] Layar kasir di bawah 1024px → peringatan tampil
- [ ] Ctrl+K dibuka-tutup 10x → tidak bug
- [ ] Ctrl+K lalu navigasi → dialog tertutup otomatis
- [ ] Rentang tanggal: klik → 7 preset, klik Kustom → baru kalender

```
commit: "R1-3: perbaikan UI umum (label, tab, scrollbar, responsif, tanggal)"
```

---

## § 4 — PRODUK & STOK 🟢

### 4.1 Hapus teks bocoran izin

**Masalah:** di halaman produk ada tulisan
"HPP & margin tampil (izin product.view_cost)".

**Perbaikan:** hapus. Ini teks internal developer yang tidak boleh
terlihat user. Cari juga teks sejenis di halaman lain.

### 4.2 Lebarkan dialog tambah/edit produk

**Perbaikan:** Sheet/Dialog form produk jadi **50% lebar layar**.

```tsx
<SheetContent className="w-full sm:max-w-[50vw]">
```

Terapkan juga ke form lain yang padat: anggota, pembelian, promo.

### 4.3 Hapus opsi delete produk

**Perbaikan:** hilangkan tombol/menu Hapus dari halaman produk.

Alasan: produk terkait transaksi historis. Menghapus merusak
integritas laporan. Ganti dengan **nonaktifkan** (`is_active = false`).

- Hapus aksi delete dari dropdown baris
- Hapus dari bulk action
- Hapus route & controller method destroy (atau kembalikan 403)

### 4.4 Tambahkan 3 kartu statistik

Di atas tabel produk:

| Kartu | Isi |
|---|---|
| Jumlah Produk | total semua produk |
| Produk Aktif | `is_active = true` |
| Produk Tidak Aktif | `is_active = false` |

Pakai `<StatCard>` yang sudah ada, 3 kolom sejajar.

### 4.5 Tampilkan gambar produk

**Sumber gambar:** folder `public/produk/`

**Perbaikan:**
- Kolom gambar (thumbnail 40×40, rounded) di kolom pertama DataTable
- Fallback ikon bila gambar tidak ada
- Di form produk: pratinjau gambar yang sudah ada
- Di layar kasir: gambar produk pada grid katalog (§ 5)
- Di storefront: gambar produk pada kartu katalog

Buat helper:

```php
// app/Support/ProductImage.php
public static function url(?Product $product): string
{
    if ($product?->primaryImage) {
        return asset('produk/' . $product->primaryImage->path);
    }
    return asset('produk/_placeholder.png');
}
```

Buat seeder yang memindai `public/produk/` dan mencocokkan nama file
dengan SKU produk.

### 4.6 Stok per outlet

**Perbaikan:** stok yang tampil & tersedia HANYA milik outlet user.

- Halaman Stok: hanya outlet user (owner bisa filter)
- Layar kasir: hanya produk yang punya stok di outlet user
- Tidak bisa menjual barang yang bukan dari outletnya
  (validasi di `SaleService`, bukan hanya di UI)

### 4.7 Kasir tidak bisa menjual barang tanpa stok di outletnya

**Aturan yang dikunci:** kasir hanya boleh menjual barang yang punya
stok di outletnya. Barang yang stoknya 0 atau bahkan tidak pernah masuk
ke outlet → tidak muncul di layar kasir, dan bila dipaksa via API →
ditolak.

**Tiga lapis pengamanan:**

**Lapis 1 — UI kasir:**
Grid produk di layar kasir HANYA menampilkan produk yang punya
`Stock::where('outlet_id', $outletId)->where('qty', '>', 0)`.
Produk dengan qty=0 → disaring keluar. Produk tanpa baris `stocks` sama
sekali → juga tidak muncul.

**Lapis 2 — Scan barcode:**
Bila kasir scan barcode produk yang tidak ada stoknya di outlet,
`BarcodeResolverService` tetap mengembalikan produk, tapi
`SaleService::addItem()` menolak dengan pesan:
"Produk {nama} tidak tersedia di outlet {nama outlet}."

**Lapis 3 — API `SaleService::complete()`:**
Sebelum FEFO consume, cek ulang:
```php
foreach ($cart as $item) {
    $stock = Stock::where('product_id', $item->product_id)
        ->where('outlet_id', $sale->outlet_id)
        ->first();

    if (!$stock || $stock->qty < $item->qty_base) {
        throw new StockUnavailableException(
            "Produk {$item->product->name} tidak tersedia di outlet ini "
            . "(stok: " . ($stock?->qty ?? 0) . ", butuh: {$item->qty_base})"
        );
    }
}
```

Ini WAJIB di service, bukan hanya di UI. Kalau hanya di UI, siapa pun
yang tahu endpoint bisa bypass.

**Kaitan dengan retur pembelian:**
Retur pembelian juga tetap dibatasi qty yang bisa dikembalikan (tidak
boleh > qty diterima). Ini aturan terpisah, sudah ada di Fase 6.

### 4.8 Checklist § 4

- [ ] Teks "HPP & margin tampil (izin...)" hilang dari semua halaman
- [ ] Dialog produk lebar 50% layar
- [ ] Tidak ada tombol Hapus di halaman produk (baris maupun bulk)
- [ ] Route destroy produk mengembalikan 403
- [ ] 3 kartu statistik tampil dengan angka benar
- [ ] Gambar produk tampil di tabel, form, kasir, storefront
- [ ] Produk tanpa gambar → placeholder, tidak error
- [ ] Login kasir outlet A → stok outlet B tidak muncul
- [ ] Kasir scan barcode produk yang stoknya 0 di outletnya → ditolak
      dengan pesan jelas
- [ ] Kasir kirim POST /pos/complete dengan produk outlet B via API
      langsung → StockUnavailableException, 422
- [ ] Retur pembelian melebihi qty diterima → ditolak

```
commit: "R1-4: produk (statistik, gambar, tanpa delete) dan stok per outlet"
```

---

## § 5 — LAYAR KASIR (POS): DESAIN ULANG 🔴

**Ini bagian paling besar. Pertimbangkan pecah jadi 2 sesi.**

### 5.1 Perubahan besar

Layar kasir sekarang **wajib menampilkan katalog produk bergambar**,
bukan hanya input barcode. Plus menu kas masuk/keluar langsung dari
kasir. Tema layar kasir tetap **navy-dominan gelap** seperti mockup
(pengecualian dari 70-20-10, lihat § 2.5).

### 5.2 Struktur layar baru

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (navy-800)                                                │
│ SKILLAGE MART   [Transaksi ▾] [Kasir ▾]                          │
│              Kasir: Ahmad, Shift Aktif · ● Online · 17:45 [Keluar]│
├────────────────────────────────────┬─────────────────────────────┤
│ [🔍 Scan barcode atau cari produk] │  PELANGGAN / MEMBER         │
│                                    │  ┌───────────────────────┐  │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │  │ [Scan Kartu Member]   │  │
│ │IMG │ │IMG │ │IMG │ │IMG │        │  └───────────────────────┘  │
│ │Nama│ │Nama│ │Nama│ │Nama│        │                             │
│ │Kat.│ │Kat.│ │Kat.│ │Kat.│        │  KERANJANG                  │
│ │Rp  │ │Rp  │ │Rp  │ │Rp  │        │  Produk    Qty Harga Total  │
│ │PROMO│ │    │ │DISK│ │    │       │  Beras 5kg  1  72rb   72rb  │
│ └────┘ └────┘ └────┘ └────┘        │  Minyak     2  24rb   48rb  │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │  Roti       1  10rb   10rb  │
│ │    │ │    │ │    │ │    │        │                             │
│ └────┘ └────┘ └────┘ └────┘        │  (ScrollArea)               │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        ├─────────────────────────────┤
│ │    │ │    │ │    │ │    │        │  RINGKASAN                  │
│ └────┘ └────┘ └────┘ └────┘        │  Subtotal      Rp 125.000   │
│                                    │  Diskon        Rp   5.000   │
│ [Kategori: Semua ▾]  [◀ 1 2 3 ▶]  │  ─────────────────────────  │
├────────────────────────────────────┤  TOTAL         Rp 120.000   │
│ [F2 Cari] [F3 Member]              │  (mono, 3xl, mustard)       │
│ [F4 Diskon] [F6 Tahan]             │  ┌───────────────────────┐  │
│                                    │  │    F9  B A Y A R      │  │
│                                    │  └───────────────────────┘  │
└────────────────────────────────────┴─────────────────────────────┘
```

### 5.3 Header

**Kiri:**
- "SKILLAGE MART" — font besar, putih, bold
- Dropdown **Transaksi**: Riwayat Hari Ini · Transaksi Tertahan ·
  Void Nota · Retur
- Dropdown **Kasir**: Buka Sesi · Tutup Sesi · Serah Terima ·
  **Kas Masuk** · **Kas Keluar** · Drop Cash · Cetak Ulang Struk

**Kanan:**
- "Kasir: {nama}, Shift Aktif"
- Indikator koneksi: titik hijau + "Online" / merah + "Terputus"
- Jam berjalan (update tiap detik)
- Tombol **Keluar** — rounded, putih, ikon orang

### 5.4 Kas Masuk / Kas Keluar dari kasir

**Baru.** Dropdown "Kasir" berisi menu kas dengan keterangan.

Dialog Kas Masuk:
- Kategori (dropdown dari `cash_categories` type=in):
  Setoran Modal · Penerimaan Piutang · Penjualan Lain · Lainnya
- Nominal
- Keterangan (wajib)
- Simpan → masuk ke sesi aktif, `total_cash_in` bertambah

Dialog Kas Keluar:
- Kategori (type=out): Beli Perlengkapan · Ongkos Kirim ·
  Biaya Operasional · Kasbon · Lainnya
- Nominal — validasi tidak melebihi kas di laci
- Keterangan (wajib)
- Lampiran bukti (opsional)
- Simpan → `total_cash_out` bertambah

### 5.5 Grid katalog produk

**Catatan data:** contoh produk di mockup Pak (Susu UHT muncul dua kali,
kategori "Beverages" untuk Deterjen/Sabun/Tissue, kategori "Grsseiofd")
adalah **placeholder**. Implementasi memakai data produk asli dari
database — kategori sesuai master data, nama sesuai `products.name`.

**Spesifikasi kartu produk:**
- Gambar produk (aspect-square, object-cover, dari `public/produk/`)
- Nama produk (2 baris, truncate)
- Kategori (teks kecil, muted)
- Harga (mono, bold)
- Badge promo di pojok: "PROMO" (merah) atau "DISKON 10%" (merah)
- Klik → langsung masuk keranjang qty 1
- Klik lagi → qty bertambah (bukan baris baru)

**Grid:** 4 kolom × 3 baris = 12 produk per halaman.
Responsif: 3 kolom di 1024–1279px, 4 kolom di ≥1280px.

**Filter kategori:** dropdown di bawah grid.
**Pagination:** panah kiri-kanan + nomor halaman.

**Sumber produk:** hanya produk `is_active = true` dan punya stok
di outlet user. Urutan: `is_favorite` dulu, lalu nama A–Z.

### 5.6 Keranjang

Kolom: Produk (dengan thumbnail kecil) · Qty · Harga · Total
Setiap baris: tombol +/− qty, tombol hapus.
ScrollArea bila panjang.

### 5.7 Panel member

- Judul "PELANGGAN / MEMBER"
- Tombol lebar hijau: **Scan Kartu Member**
- Setelah terpilih: foto, nama, kelas, saldo besar, badge level,
  peringatan limit bila ada
- Tombol ganti/lepas member

### 5.8 Ringkasan & bayar

- "RINGKASAN"
- Subtotal · Diskon · (Pembulatan bila ada)
- **TOTAL** — font mono, ukuran 3xl, warna mustard (aksen 10%)
- Tombol **BAYAR** — hijau, lebar penuh, tinggi besar, label "F9 BAYAR"

### 5.9 Footer hotkey

Empat tombol rounded putih: `F2 Cari` · `F3 Member` · `F4 Diskon` ·
`F6 Tahan`

Hotkey lain tetap aktif meski tidak ditampilkan (F9 Bayar, F8 Void, dst).

### 5.10 Checklist § 5

- [ ] Header sesuai spesifikasi (kiri: brand + 2 dropdown, kanan: info)
- [ ] Dropdown Transaksi & Kasir berfungsi
- [ ] Kas Masuk dari kasir → tersimpan, `total_cash_in` bertambah
- [ ] Kas Keluar melebihi saldo laci → ditolak
- [ ] Grid katalog 12 produk dengan gambar tampil
- [ ] Klik produk → masuk keranjang
- [ ] Klik produk sama 2x → qty jadi 2, bukan 2 baris
- [ ] Badge PROMO / DISKON tampil pada produk yang ada promo
- [ ] Filter kategori berfungsi
- [ ] Pagination berfungsi
- [ ] Hanya produk outlet user yang tampil
- [ ] Scan barcode tetap berfungsi bersamaan dengan klik grid
- [ ] Input barcode auto-focus setelah setiap aksi
- [ ] Panel member: scan kartu berfungsi
- [ ] Total tampil mono 3xl warna mustard
- [ ] Tombol BAYAR hijau besar, F9 berfungsi
- [ ] 4 tombol hotkey footer tampil dan berfungsi
- [ ] Jam berjalan update tiap detik
- [ ] Indikator online/offline akurat

```
commit: "R1-5: desain ulang layar kasir dengan katalog bergambar"
```

---

## § 6 — DEPOSIT & VERIFIKASI 2 LANGKAH 🟡

### 6.1 JAWABAN — Halaman Adjust Deposit

> **Pertanyaan Pak:** "Saya tidak melihat menu adjust deposit. Kata kamu
> ada, padahal di sini tidak ada."

Pak benar — dalam dokumen fase memang **disebut** (Fase 4 § 4, tab
"Penyesuaian"), tapi **belum diimplementasikan UI-nya**. Yang ada baru
service `DepositService::adjust()` di backend.

Jadi bukan Pak yang melewatkan; memang belum dibuat. Berikut
spesifikasi lengkapnya.

### 6.2 Halaman Penyesuaian Saldo (BARU)

**Lokasi:** `/admin/deposit` tab **Penyesuaian**
**Akses:** HANYA owner (permission `deposit.adjust`)

**Isi halaman:**

Bagian atas — form penyesuaian:
- Cari anggota (scan kartu / NIS / nama)
- Setelah terpilih: tampil foto, nama, kelas, **saldo sekarang** (besar)
- Jenis penyesuaian: **Tambah (+)** atau **Kurangi (−)** — radio
- Nominal
- **Alasan** — textarea, WAJIB, minimal 20 karakter
- Pratinjau: "Saldo Rp 50.000 → Rp 75.000 (+Rp 25.000)"
- Tombol Simpan → dialog konfirmasi + **PIN owner**

Bagian bawah — riwayat penyesuaian:
- DataTable: tanggal, anggota, jenis, nominal, saldo sebelum,
  saldo sesudah, alasan, dilakukan oleh
- Filter: anggota, jenis, rentang tanggal
- Ekspor Excel

**Aturan:**
- Setiap penyesuaian tercatat di `deposit_transactions` type `adjustment`
- Tercatat juga di activity log dengan detail lengkap
- Tidak bisa dihapus atau diedit
- `idempotency_key` = `adjust_{member_id}_{timestamp}`
- Notifikasi ke wali bila penyesuaian negatif (opsional, Fase 16)

### 6.3 Verifikasi 2 langkah untuk top-up

> **Kekhawatiran Pak:** "Tidak ada verifikasi 2 langkah dalam deposit
> saldo. Bagaimana jika transfer? Bagaimana jika tunai? Masa tau-tau
> saldonya bertambah."

Ini kekhawatiran yang tepat. Berikut solusinya, dibedakan per jalur.

**Jalur A — Top-up TUNAI di kasir**

Alur sekarang: kasir input nominal → saldo langsung bertambah.
Risiko: kasir bisa menambah saldo tanpa uang masuk.

**Perbaikan — konfirmasi dua pihak:**

```
1. Kasir input: anggota + nominal + metode Tunai
2. Layar konfirmasi menampilkan:
   ┌─────────────────────────────────┐
   │ KONFIRMASI TOP-UP               │
   │ Nama   : Ahmad Fauzi            │
   │ Kelas  : X PPLG 1               │
   │ Saldo  : Rp 23.500              │
   │ Top-Up : Rp 50.000              │
   │ Menjadi: Rp 73.500              │
   │                                 │
   │ Terima uang tunai Rp 50.000?    │
   │ [Batal]  [Ya, Uang Diterima]    │
   └─────────────────────────────────┘
3. Kasir klik "Ya, Uang Diterima"
4. Saldo bertambah, struk tercetak 2 rangkap
   (1 untuk santri, 1 untuk arsip kasir)
5. Uang masuk laci → total_topup_cash bertambah
   → tercek saat tutup sesi
```

**Pengaman utamanya adalah rekonsiliasi kas:** jika kasir menambah
saldo tanpa uang masuk, saat tutup sesi kas fisik akan **kurang** dari
`expected_cash`. Selisih ini wajib dijelaskan + PIN supervisor.

Tambahan pengaman untuk nominal besar:
- Top-up > Rp 200.000 (config) → **wajib PIN supervisor**

**Jalur B — Top-up TRANSFER dari wali**

Ini sudah 2 langkah secara alami:

```
1. Wali ajukan di portal: nominal + upload bukti transfer
   → status: PENDING, saldo BELUM bertambah
2. Admin/bendahara buka tab Verifikasi Transfer
3. Cek bukti: nominal cocok? rekening benar? tanggal sesuai?
4. Cocokkan dengan mutasi rekening bank
5. Klik Setujui → BARU saldo bertambah
   atau Tolak + alasan → wali dapat notifikasi
```

**Perbaikan yang perlu ditambahkan:**
- Tombol Setujui butuh **konfirmasi kedua** (dialog "Sudah dicek
  mutasi rekening?")
- Nominal > Rp 500.000 → wajib **PIN supervisor/owner**
- Tampilkan peringatan bila ada request dengan nominal & tanggal sama
  (indikasi bukti dipakai ulang)
- Simpan hash gambar bukti → tolak bila bukti identik pernah dipakai

**Jalur C — Penyesuaian manual**
Sudah dibahas di § 6.2 — owner only + PIN + alasan wajib.

### 6.4 Ringkasan pengaman deposit

| Jalur | Pengaman |
|---|---|
| Top-up tunai | Konfirmasi kasir + rekonsiliasi kas saat tutup sesi + PIN supervisor bila >200rb |
| Top-up transfer | Wali ajukan → admin verifikasi bukti → konfirmasi kedua + PIN bila >500rb + deteksi bukti duplikat |
| Penyesuaian | Owner only + PIN + alasan wajib + audit log |
| Semua jalur | `idempotency_key` + ledger append-only + rekonsiliasi harian |

### 6.5 Checklist § 6

- [ ] Tab Penyesuaian ada di `/admin/deposit`
- [ ] Hanya owner yang bisa membuka (role lain → 403)
- [ ] Form penyesuaian lengkap dengan pratinjau saldo
- [ ] Alasan < 20 karakter → validasi menolak
- [ ] Simpan → dialog konfirmasi + PIN owner
- [ ] Riwayat penyesuaian tampil dengan alasan lengkap
- [ ] Top-up tunai → layar konfirmasi "Uang Diterima" muncul
- [ ] Top-up tunai > 200rb → PIN supervisor diminta
- [ ] Top-up tunai → struk 2 rangkap
- [ ] Top-up tunai palsu → saat tutup sesi kas kurang, terdeteksi
- [ ] Verifikasi transfer → dialog konfirmasi kedua muncul
- [ ] Verifikasi transfer > 500rb → PIN diminta
- [ ] Upload bukti yang sama 2x → peringatan duplikat muncul
- [ ] Tolak top-up → wali dapat notifikasi dengan alasan

```
commit: "R1-6: penyesuaian saldo dan verifikasi 2 langkah deposit"
```

---

## § 7 — LAPORAN, PEMBELIAN, SESI KASIR 🟡

### 7.1 Tata letak kartu laporan tidak rapi

**Masalah:** baris pertama 3 kartu, baris kedua 1 kartu — terlihat bolong.

**Perbaikan:** grid seimbang per kelompok.

Aturan:
- 1 kartu → lebar penuh
- 2 kartu → 2 kolom sejajar
- 3 kartu → 3 kolom sejajar
- 4 kartu → 2×2
- 5 kartu → 3 + 2 (baris kedua kartu melebar mengisi)
- 6 kartu → 3×3
- ≥7 → 3 per baris, sisa terakhir melebar mengisi

```tsx
// Helper
function gridClass(count: number) {
  if (count === 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-1 md:grid-cols-2'
  if (count === 4) return 'grid-cols-1 md:grid-cols-2'
  return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
}
// Baris terakhir yang tidak penuh → kartu terakhir pakai
// class 'md:col-span-full lg:col-span-1' sesuai sisa
```

Terapkan per kelompok laporan (Penjualan, Persediaan, Keuangan,
Deposit & Anggota).

### 7.2 Cari transaksi berdasarkan nomor invoice

**Baru.** Tambahkan di `/admin/penjualan` — kotak pencarian menonjol
di atas:

- Input besar: "Ketik atau scan nomor invoice (INV-20260730-0045)"
- Auto-focus
- Enter → langsung buka halaman detail nota
- Bila tidak ketemu → pesan jelas
- Bila format tidak lengkap (misal ketik "0045") → cari yang cocok,
  tampilkan daftar

Halaman detail nota berisi: header nota, daftar item, pembayaran,
member, kasir, sesi, status, tombol Cetak Ulang / Retur / Void.

### 7.3 Detail pembelian

**Masalah:** hanya ada nomor referensi, tidak ada tombol lihat detail.

**Perbaikan:** tambahkan tombol/klik baris → halaman detail berisi:
- Header: referensi, pemasok, tanggal, faktur, jatuh tempo, status
- Daftar item: produk, qty, satuan, harga, diskon, subtotal,
  batch, kadaluwarsa, HPP final
- Biaya tambahan dengan alokasinya
- Ringkasan: subtotal, diskon, pajak, biaya lain, total
- Status pembayaran: terbayar, sisa, riwayat pembayaran
- Tombol: Cetak, Retur, Batalkan (bila masih draft)

### 7.4 Halaman baru untuk tambah pembelian

**Masalah:** form tambah pembelian di dalam popup terlalu sempit.

**Perbaikan:** ubah jadi **halaman penuh**, bukan Sheet/Dialog.

Route: `/admin/pembelian/tambah`
Layout: AdminLayout dengan PageHeader "Tambah Pembelian"

Alasan: form pembelian punya banyak baris item + panel batch/expired
+ biaya tambahan. Popup tidak cukup.

### 7.5 Riwayat transaksi di sesi kasir

**Baru.** Di detail sesi kasir, tambahkan tab/bagian:

- Daftar semua transaksi selama sesi tersebut
- Kolom: waktu, no. nota, member, item, total, metode bayar, status
- Klik → detail nota
- Ringkasan: jumlah transaksi, total penjualan, rata-rata per nota
- Filter: metode bayar, status (normal/void)

### 7.6 Laporan per outlet

- Setiap laporan WAJIB punya filter outlet
- **Owner** → dropdown semua outlet + opsi "Semua Outlet" (gabungan)
- **Admin** → hanya outlet yang dimiliki
- **Role lain** → terkunci ke outletnya, dropdown tidak tampil
- Judul laporan mencantumkan nama outlet
- Ekspor Excel/PDF juga mencantumkan outlet

Revisi semua query laporan agar menerima parameter `outlet_id`
(atau array untuk gabungan).

### 7.7 Checklist § 7

- [ ] Kartu laporan tersusun rapi di semua kelompok (tidak bolong)
- [ ] Uji dengan 1, 2, 3, 4, 5, 7 kartu → semua rapi
- [ ] Kotak cari invoice ada dan auto-focus
- [ ] Ketik nomor invoice lengkap → langsung buka detail
- [ ] Ketik sebagian → daftar hasil yang cocok
- [ ] Tombol detail pembelian ada, halaman detail lengkap
- [ ] Tambah pembelian membuka halaman baru, bukan popup
- [ ] Detail sesi kasir punya riwayat transaksi
- [ ] Klik transaksi di riwayat sesi → buka detail nota
- [ ] Semua laporan punya filter outlet
- [ ] Owner bisa pilih "Semua Outlet"
- [ ] Kasir outlet A buka laporan → hanya data outlet A
- [ ] Judul & ekspor mencantumkan nama outlet

```
commit: "R1-7: laporan per outlet, detail pembelian, riwayat sesi kasir"
```

---

## § 8 — PORTAL WALI & DASHBOARD 🟢

### 8.1 Wali ubah password sendiri

**Masalah:** wali harus minta admin untuk ganti password.

**Perbaikan:** halaman `/wali/pengaturan` tab **Keamanan**:
- Password lama
- Password baru (minimal 8 karakter, indikator kekuatan)
- Ulangi password baru
- Simpan → notifikasi sukses + logout semua sesi lain

Tambahkan juga **Lupa Password** di halaman login wali —
alur pertanyaan keamanan:

**Langkah 1:** input **nomor HP wali**
**Langkah 2:** sistem menampilkan pertanyaan verifikasi anak.
Bila wali punya beberapa anak, sistem memilih satu anak acak dan
menanyakan:
- **NIS anak**
- **Nama lengkap anak** (harus persis sama dengan data di sistem)
- **Tanggal lahir anak** (format DD-MM-YYYY, dengan date picker)

Ketiganya harus benar. Salah satu meleset → gagal.

**Langkah 3:** bila benar, tampilkan form password baru:
- Password baru (min 8 karakter, indikator kekuatan)
- Ulangi password baru
- Simpan → login otomatis dengan password baru + notifikasi
  "Password berhasil diubah pada {waktu} dari IP {ip}"

**Pengaman:**
- Rate limit 3 percobaan per HP per jam
- Setelah 3 gagal → kunci HP tersebut selama 24 jam
- Setiap percobaan (sukses atau gagal) dicatat di activity log dengan
  IP dan user agent
- Bila wali gagal berkali-kali, notifikasi ke admin (indikasi ada yang
  coba jebol)

**Yang TIDAK boleh terjadi:**
- Sistem TIDAK menampilkan daftar nama anak untuk dipilih (itu bocor)
- Sistem TIDAK bilang "NIS benar tapi tanggal lahir salah" (partial
  feedback = bocor info)
- Pesan gagal: "Data tidak cocok. Silakan coba lagi atau hubungi
  admin." — netral, tidak ungkap mana yang salah

### 8.2 Notifikasi untuk wali

**Masalah:** wali tidak tahu top-up diterima atau ditolak.

**Perbaikan — notifikasi dalam aplikasi saja** (WhatsApp gateway
belum dipakai di MVP):

- Ikon lonceng di header WaliLayout dengan badge jumlah belum dibaca
- Panel dropdown: daftar notifikasi
- Halaman `/wali/notifikasi`: riwayat lengkap

Jenis notifikasi:
| Kejadian | Pesan |
|---|---|
| Top-up disetujui | "Top-up Rp 50.000 untuk Ahmad telah disetujui. Saldo sekarang Rp 73.500." |
| Top-up ditolak | "Top-up Rp 50.000 ditolak. Alasan: {alasan}. Silakan ajukan ulang." |
| Saldo menipis | "Saldo Ahmad tersisa Rp 8.000. Silakan top-up." |
| Rekap mingguan | "Belanja Ahmad minggu ini Rp 45.000. Sisa saldo Rp 28.500." |
| Ulang tahun | "Selamat ulang tahun Ahmad! Bonus saldo Rp 10.000 telah ditambahkan." |

Simpan di tabel `notifications` bawaan Laravel.
Tandai dibaca saat diklik.

**Karena hanya dalam aplikasi**, wali baru tahu setelah membuka portal.
Untuk kompensasi:
- Poll notifikasi setiap 30 detik saat portal terbuka (ringan, hanya
  hitungan belum-dibaca)
- Bunyi lonceng halus saat ada notifikasi baru
- Judul tab browser berubah: "(3) Portal Wali" saat ada belum dibaca
- Toast dari Sonner untuk notifikasi yang baru masuk

Bila nanti WhatsApp gateway diaktifkan, notifikasi yang sama akan
otomatis dikirim ke WA — kode notification-nya sudah siap
polymorphic.

### 8.3 Dashboard tidak rapi

**Masalah:** dashboard admin bolong karena kekurangan satu kartu
statistik yang ada di dashboard owner.

**Perbaikan:**

- Samakan jumlah kartu statistik agar grid selalu penuh
- Bila suatu role tidak boleh melihat sebuah metrik, **ganti dengan
  metrik lain yang boleh**, jangan dikosongkan

Kartu statistik per role (4 kartu, selalu genap):

| Role | Kartu 1 | Kartu 2 | Kartu 3 | Kartu 4 |
|---|---|---|---|---|
| Owner | Penjualan Hari Ini | Laba Kotor | Jumlah Transaksi | Rata-rata/Nota |
| Admin | Penjualan Hari Ini | Jumlah Transaksi | Rata-rata/Nota | Anggota Aktif |
| Supervisor | Penjualan Hari Ini | Jumlah Transaksi | Void Hari Ini | Sesi Aktif |
| Kasir | Penjualan Saya | Transaksi Saya | Durasi Shift | Saldo Laci |
| Gudang | Stok Kritis | Akan Kadaluwarsa | PO Menunggu | Transfer Berjalan |
| Bendahara | Saldo Kas | Hutang Jatuh Tempo | Piutang Menunggak | Deposit Beredar |

**Tata letak fleksibel:**
- Grid 12 kolom
- Setiap widget punya ukuran: `sm` (3 kolom), `md` (6), `lg` (12)
- Widget disusun agar setiap baris genap 12 kolom
- Tidak boleh ada ruang kosong di tengah baris

**Opsional (bila waktu memungkinkan):** widget bisa diatur ulang
oleh user (drag-drop), tersimpan di preferensi user.

### 8.4 Batasi hak kasir pada produk & stok

**Perbaikan:** role `cashier` hanya boleh **melihat** produk dan stok.

Cabut permission dari role cashier:
- `product.create`, `product.update`, `product.delete`
- `stock.create`, `stock.update`, `stock.delete`
- `category.create/update/delete`, `brand.*`, `unit.*`

Sisakan: `product.view`, `stock.view`

Konsekuensi UI: tombol Tambah/Edit/Hapus tidak tampil untuk kasir.
Route tetap dilindungi middleware permission.

### 8.5 Owner mengatur durasi sesi login

**Baru.** Saat ini durasi sesi ditentukan sistem dan tidak bisa diubah.

**Perbaikan:** halaman `/admin/pengaturan` tab **Sesi & Keamanan**
(akses: owner saja).

Isi:
- Tabel: Role | Durasi Sesi (menit) | Aksi
- Setiap role bisa diatur durasinya, termasuk owner sendiri
- Rentang wajar: 5–1440 menit
- Nilai awal: cashier 30, warehouse 60, supervisor 120,
  treasurer 120, admin 120, owner 480, guardian 120
- Tombol "Kembalikan ke Bawaan"
- Perubahan berlaku pada login berikutnya

Simpan di tabel `settings` group `security`, key
`session_lifetime_{role}`.

Middleware `AdjustSessionLifetime` membaca dari settings,
bukan hardcode.

### 8.6 Checklist § 8

- [ ] Wali bisa ubah password sendiri
- [ ] Password lama salah → ditolak
- [ ] Lupa password: input HP → pertanyaan NIS + nama + tanggal lahir
- [ ] Ketiga jawaban benar → boleh set password baru
- [ ] Salah satu jawaban meleset → gagal dengan pesan netral
      (tidak sebut mana yang salah)
- [ ] Gagal 3x dalam sejam → HP terkunci 24 jam
- [ ] Percobaan reset (sukses/gagal) tercatat di activity log
- [ ] Sistem TIDAK menampilkan daftar nama anak untuk dipilih
- [ ] Lonceng notifikasi ada di header wali
- [ ] Top-up disetujui → notifikasi masuk ke wali
- [ ] Top-up ditolak → notifikasi berisi alasan
- [ ] Klik notifikasi → tandai dibaca, badge berkurang
- [ ] Poll otomatis setiap 30 detik saat portal terbuka
- [ ] Notifikasi baru → bunyi lonceng + toast + judul tab berubah
- [ ] Judul tab: "(3) Portal Wali" saat ada 3 belum dibaca
- [ ] Dashboard setiap role punya 4 kartu statistik (tidak bolong)
- [ ] Grid dashboard selalu genap, tidak ada ruang kosong
- [ ] Login kasir → tidak ada tombol Tambah/Edit/Hapus di produk & stok
- [ ] Kasir akses route produk.create via URL → 403
- [ ] Tab Sesi & Keamanan ada, hanya owner bisa buka
- [ ] Ubah durasi sesi kasir jadi 15 menit → berlaku di login berikutnya
- [ ] Owner ubah durasi sesinya sendiri → berlaku

```
commit: "R1-8: portal wali (password, notifikasi), dashboard, pengaturan sesi"
```

---

## § 9 — DESAIN KARTU MEMBER 🟢

### 9.1 Spesifikasi

Orientasi **horizontal**, rasio kartu standar **85,6 × 54 mm**.
Gaya: modern, formal, islami, minimalis, bersih, profesional.

**Latar & bingkai:**
- Background: `#FAFAF8` (off-white)
- Border tipis: `#D8D8D8`, opacity 70%
- Rounded corner: 28–30 px
- Pola geometris islami (garis bersudut / maze) warna `#C7CBD1`,
  ketebalan 1,5–2 px, opacity 15–20%, di seluruh permukaan

**Logo (kiri atas):**
- Tiga logo lembaga, susunan horizontal
- Tinggi 45–55 px, jarak antarlogo 8–14 px
- **Jangan ubah proporsi logo**
- Sumber: folder `public/logo/`

**Foto santri:**
- Ukuran ±195 × 270 px, di bawah logo
- Background `#D9D9D9`
- Bila foto belum ada: tulisan "FOTO" di tengah,
  IBM Plex Mono Medium 18 px, warna `#252525`

**Informasi santri (kanan foto, vertikal):**
```
FULL NAME
SYAHLA KAYYISAH
NIS
229384759205
KELAS
XII. PPLG (Pengembangan Perangkat Lunak dan GIM)
```
- Label: Poppins SemiBold / Inter SemiBold, 23–25 px
- Isi data: IBM Plex Mono / Space Mono, 17–19 px
- Warna teks utama `#111111`
- Line height 145%

**Ornamen (kanan atas):**
- Bentuk pita / bidang geometris bertumpuk
- Warna: navy `#07395A`, dark navy `#042A45`,
  medium navy `#0A4C72`, blue accent `#115C82`
- Opacity 100%, tekstur grain halus opacity 8–12%
- Menempel pada sisi atas dan kanan
- Bentuk lengkung serta diagonal
- **Tidak menutupi informasi utama**

**Barcode (kanan bawah):**
- Ukuran ±155 × 95 px
- Background putih, padding 6–8 px
- Nomor di bawahnya: `5901234123457` (contoh; isi = member_number)

**Footer:**
- Tinggi 50 px
- Garis putus-putus 2 px, warna `#7A7A7A`, opacity 75%
- Teks tengah: "BERLAKU SELAMA MENJADI SANTRI"
- IBM Plex Mono Medium 16–18 px, warna `#333333`,
  letter spacing 1–1,5 px

**Lain-lain:**
- Hapus tulisan "Frame 3" bila ada
- Desain presisi, tajam, mudah dibaca
- Siap dicetak

### 9.2 Catatan penting soal warna

⚠ Spesifikasi kartu memakai navy `#07395A` — berbeda dari navy
aplikasi `#1B3A6B` (navy-600).

**Keputusan yang perlu Pak ambil:**
- **Opsi A:** kartu pakai `#07395A` sesuai spesifikasi (kartu punya
  identitas visual sendiri, terpisah dari aplikasi)
- **Opsi B:** kartu pakai `#1B3A6B` agar seragam dengan aplikasi

Saya sarankan **Opsi A** — kartu fisik memang boleh punya palet
sendiri yang lebih dalam, karena dicetak dan dilihat terpisah dari
layar. Tapi keputusan ada di Pak.

Sampaikan pilihan Pak di awal sesi R1-9.

### 9.3 Implementasi

**Teknis:** template Blade + dompdf (`resources/views/pdf/member-card.blade.php`)

- Ukuran halaman: A4 portrait
- Grid: 2 kolom × 4 baris = 8 kartu per halaman
- Garis potong tipis di setiap sisi kartu
- Pola islami: SVG inline atau PNG tiling dengan opacity
- Font: embed via `@font-face` (jangan andalkan CDN saat cetak)
- Barcode: `picqer/php-barcode-generator`, output PNG base64
- Logo: dari `public/logo/`, embed base64 agar pasti ter-render

**Halaman pratinjau:** sebelum cetak massal, tampilkan pratinjau
1 kartu di layar agar bisa dicek sebelum menghabiskan kertas.

### 9.4 Checklist § 9

- [ ] Keputusan warna navy kartu (Opsi A atau B) sudah diambil
- [ ] Template kartu horizontal 85,6 × 54 mm
- [ ] Background `#FAFAF8`, border `#D8D8D8` 70%
- [ ] Rounded corner 28–30 px
- [ ] Pola islami tampil dengan opacity 15–20%
- [ ] Tiga logo dari `public/logo/` tampil, proporsi tidak berubah
- [ ] Area foto 195 × 270 px, placeholder "FOTO" bila kosong
- [ ] Informasi santri lengkap dengan font & ukuran sesuai
- [ ] Ornamen navy bertumpuk di kanan atas, tidak menutupi teks
- [ ] Barcode kanan bawah dengan nomor di bawahnya
- [ ] Barcode bisa di-scan dan resolve ke anggota benar
- [ ] Footer garis putus-putus + teks "BERLAKU SELAMA MENJADI SANTRI"
- [ ] Tidak ada tulisan "Frame 3"
- [ ] Cetak A4: 8 kartu per halaman dengan garis potong
- [ ] Halaman pratinjau 1 kartu berfungsi
- [ ] Cetak 70 kartu → 9 halaman, semua rapi

```
commit: "R1-9: desain ulang kartu member"
```

---

## § 10 — RINGKASAN TEMUAN YANG SUDAH DIJAWAB

Tiga pertanyaan Pak yang saya jawab langsung di dokumen ini:

| Pertanyaan | Jawaban di |
|---|---|
| Bagaimana sistem laci kasir? 5 kasir berbagi? | § 1.7 |
| Menu adjust deposit tidak ada, padahal katanya ada | § 6.1 — memang belum diimplementasi, spesifikasi di § 6.2 |
| Verifikasi 2 langkah deposit bagaimana? | § 6.3 |

---

## § 11 — SEMUA KLARIFIKASI SUDAH DIJAWAB

Semua pertanyaan sudah tuntas — lihat ringkasan di bagian atas dokumen.

Yang **belum** dijawab (Pak lewatkan di jawaban terakhir):
- **Item "Pengguna:" di daftar Pak kosong.** Ini bukan pertanyaan
  urgent — bila memang tidak ada temuan, biarkan saja. Bila nanti
  Pak temukan sesuatu di halaman Pengguna saat uji coba, tambahkan
  ke revisi berikutnya (REVISI-R2.md).

---

*REVISI R1 — Skillage Mart POS · SMK Skill Village Islamic School*
