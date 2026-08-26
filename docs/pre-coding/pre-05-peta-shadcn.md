# PRE-05 — PETA KOMPONEN shadcn/ui

**Tujuan:** memetakan komponen shadcn/ui yang dibutuhkan **per halaman**
sebelum satu baris JSX ditulis. Ini mencegah AI membuat komponen custom
padahal shadcn sudah menyediakan, dan mencegah install-berlebihan yang
membuat bundle besar.

**Estimasi waktu:** 60 menit.
**Prasyarat:** pre-03 selesai (SPEC.md dan backlog tiket sudah ada).
Output: `docs/PETA-KOMPONEN.md`.

**Catatan:** shadcn/ui **belum di-install** di tahap ini — install dilakukan
di Fase 0 saat proyek Laravel + Inertia + React sudah berdiri. Tahap ini
hanya **perencanaan**.

---

## 1. INVENTARISASI HALAMAN

Ambil dari `SPEC.md` dan `fase-ui-01-perbaikan-navigasi.md`. Total halaman:

### Publik (tanpa login)
1. Beranda storefront (`/`)
2. Katalog produk (`/produk`)
3. Detail produk (`/produk/{slug}`)
4. Halaman promo (`/promo`)
5. Tentang (`/tentang`)
6. Kontak (`/kontak`)
7. FAQ (`/faq`)
8. Cek saldo kiosk (`/cek-saldo`)

### Auth
9. Login staff (`/login`)
10. Login wali (`/wali/login`)
11. Lupa password (`/lupa-password`)

### Portal Wali (login wali)
12. Beranda wali (`/wali`)
13. Detail anak (`/wali/anak/{id}`)
14. Ajukan top-up (`/wali/top-up`)
15. Pengaturan notifikasi (`/wali/pengaturan`)

### Kasir (`/pos`)
16. Layar kasir utama
17. Modal pembayaran multi-metode
18. Modal identifikasi anggota
19. Modal PIN supervisor
20. Modal hold & recall
21. Modal buka/tutup sesi
22. Modal kas masuk/keluar/drop

### Admin
23. Dashboard per role (owner, admin, supervisor, cashier, warehouse, treasurer)
24. Produk (tab: Produk, Kategori, Brand, Satuan)
25. Form produk (bertab: Umum, Barcode, Harga, Konversi, Stok Min-Maks)
26. Anggota (tab: Daftar, Kartu, Level, Arsip Lulus)
27. Form anggota (bertab: Identitas, Wali, Level & Limit, Kartu)
28. Cetak kartu massal
29. Deposit (tab: Top-Up, Riwayat, Penarikan, Penyesuaian, Verifikasi, Saldo Mengendap, Rekonsiliasi)
30. Sesi & Kas (tab: Sesi Kasir, Buku Kas, Daftar Sesi)
31. Penjualan (tab: Riwayat, Retur, Void)
32. Pembelian (tab: PO, Penerimaan, Daftar, Retur, Perubahan Harga)
33. Konsinyasi (tab: Penerimaan, Settlement, Retur)
34. Stok (dengan chip filter)
35. Opname & Transfer (tab: Opname, Transfer, Penyesuaian)
36. Wizard opname (draft → counting → review → approved → posted)
37. Hutang & Piutang (tab: Hutang, Piutang, Aging)
38. Jurnal (tab: Jurnal Umum, Buku Besar, Neraca Saldo, CoA)
39. Laporan (grid kartu laporan)
40. Report viewer generik (dipakai semua laporan)
41. Diskon & Promo (tab: Promo, Kupon, Poin)
42. Simulator diskon
43. Mitra & Outlet (tab: Supplier, Outlet, Metode Bayar, Akun Kas, Kategori Kas)
44. Pengaturan (tab: Pengguna, Role & Izin, Log Aktivitas, Konfigurasi)
45. Profil pengguna

**Total: ~45 halaman + banyak modal.**

---

## 2. KOMPONEN shadcn/ui YANG PERLU DIINSTALL

Berdasarkan analisis 45 halaman, ini daftar minimum:

### Foundation (wajib untuk semua)
```bash
# Akan dijalankan di Fase 0, JANGAN sekarang
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add sheet
npx shadcn@latest add dropdown-menu
npx shadcn@latest add popover
npx shadcn@latest add tooltip
npx shadcn@latest add badge
npx shadcn@latest add separator
```

### Form-heavy
```bash
npx shadcn@latest add form
npx shadcn@latest add select
npx shadcn@latest add checkbox
npx shadcn@latest add radio-group
npx shadcn@latest add switch
npx shadcn@latest add textarea
npx shadcn@latest add calendar
npx shadcn@latest add date-picker
npx shadcn@latest add command   # untuk combobox pencarian produk cepat
```

### Data display
```bash
npx shadcn@latest add table
npx shadcn@latest add tabs
npx shadcn@latest add accordion
npx shadcn@latest add avatar
npx shadcn@latest add skeleton
npx shadcn@latest add pagination
npx shadcn@latest add scroll-area
```

### Feedback
```bash
npx shadcn@latest add toast    # atau sonner (lebih modern)
npx shadcn@latest add sonner
npx shadcn@latest add alert
npx shadcn@latest add alert-dialog
npx shadcn@latest add progress
```

### Navigation
```bash
npx shadcn@latest add navigation-menu
npx shadcn@latest add breadcrumb
npx shadcn@latest add sidebar   # shadcn/ui punya sidebar bawaan
```

### Advanced (sesuai kebutuhan, install saat perlu)
```bash
npx shadcn@latest add hover-card
npx shadcn@latest add context-menu
npx shadcn@latest add resizable   # untuk layar kasir split-pane
npx shadcn@latest add carousel    # storefront: banner
```

**Total: ~32 komponen.** Ini "sekali install" — dipakai di banyak halaman.

---

## 3. LIBRARY TAMBAHAN (BUKAN shadcn)

Yang shadcn tidak sediakan, tapi wajib:

```bash
# Akan dijalankan di Fase 0
npm install @tanstack/react-table       # tabel data dengan sort/filter
npm install @tanstack/react-query       # kalau butuh fetch di luar Inertia
npm install zustand                     # state global (cart kasir)
npm install react-hotkeys-hook          # hotkey F1-F12 di kasir
npm install react-hook-form             # form dengan validasi
npm install @hookform/resolvers zod     # schema validation
npm install date-fns                    # date utility
npm install recharts                    # chart di dashboard
npm install lucide-react                # ikon (default shadcn)
npm install clsx tailwind-merge         # helper class (via shadcn cn())
npm install class-variance-authority    # variant tombol (via shadcn)
```

---

## 4. PETA KOMPONEN PER HALAMAN

Tulis di `docs/PETA-KOMPONEN.md`. Contoh format:

```markdown
# PETA KOMPONEN — Skillage Mart POS

Untuk setiap halaman, komponen shadcn/ui yang dipakai, dan komponen
custom yang perlu dibangun sendiri.

---

## STOREFRONT PUBLIK

### 1. Beranda (`/`)
- **shadcn:** Card, Button, Badge, Carousel (banner)
- **Custom:** `ProductCard`, `PromoBanner`, `CategoryPills`, `FooterPublik`
- **Layout:** `PublicLayout`
- **State:** none (server-rendered dari Inertia)

### 2. Katalog Produk (`/produk`)
- **shadcn:** Input (search), Select (kategori), Badge, Pagination, Card, Skeleton
- **Custom:** `ProductCard`, `ProductFilterBar`, `EmptyState`
- **Layout:** `PublicLayout`
- **State:** filter di URL query, sort local component state
- **Catatan:** stok tidak ditampilkan angka, hanya "Tersedia"/"Habis" via Badge

### 3. Detail Produk (`/produk/{slug}`)
- **shadcn:** Card, Badge, Button, Tabs (deskripsi/spesifikasi), Alert
- **Custom:** `ProductGallery`, `RelatedProducts`
- **Layout:** `PublicLayout`

---

## AUTH

### 9. Login Staff (`/login`)
- **shadcn:** Card, Input, Label, Button, Form, Alert
- **Custom:** `AuthLogo`
- **Layout:** `GuestLayout`
- **Validation:** react-hook-form + zod (username, password required)
- **Catatan:** rate limit 5x/menit per IP

### 10. Login Wali (`/wali/login`)
- Sama dengan #9 tapi dengan `WaliLayout`
- Input: nomor HP (dengan format Indonesia) + password

---

## PORTAL WALI

### 12. Beranda Wali (`/wali`)
- **shadcn:** Card, Avatar, Badge, Separator, Button
- **Custom:** `KartuAnak` (satu kartu per santri), `RingkasanSaldo`
- **Layout:** `WaliLayout`
- **State:** data dari Inertia props (array anak)

### 13. Detail Anak (`/wali/anak/{id}`)
- **shadcn:** Card, Tabs (Saldo & Grafik / Riwayat Belanja / Top-Up), Badge, Table
- **Custom:** `GrafikPemakaian` (recharts), `RiwayatBelanjaList`
- **Layout:** `WaliLayout`

### 14. Ajukan Top-Up (`/wali/top-up`)
- **shadcn:** Card, Input, Label, Button, Form, Tabs, RadioGroup, Alert
- **Custom:** `NominalCepat` (tombol 10rb/20rb/50rb/100rb), `UnggahBukti`
- **Layout:** `WaliLayout`
- **Validation:** zod schema (nominal min 10.000, file bukti wajib untuk manual)

---

## KASIR

### 16. Layar Kasir Utama (`/pos`)
- **shadcn:** Input (barcode), Card, Table, Button, Badge, ScrollArea, Resizable
- **Custom:** `CartTable`, `TotalPanel`, `MemberPanel`, `FavoriteProductGrid`,
  `HotkeyBar`, `StatusBar` (koneksi, sesi aktif, kasir)
- **Layout:** `PosLayout` (fullscreen, minimalis)
- **State:** Zustand store — `useCartStore`, `useSessionStore`
- **Hotkey:** react-hotkeys-hook — F1..F11, +/-, arrow, ESC, Del
- **Catatan:** auto-focus input barcode setelah SETIAP aksi

### 17. Modal Pembayaran Multi-Metode
- **shadcn:** Dialog, Button, Input, Tabs, Badge, Alert, Separator
- **Custom:** `PaymentMethodPicker`, `PaymentBreakdown`, `SplitPaymentList`
- **State:** local state modal + koneksi ke Zustand cart

---

## ADMIN

### 24. Produk (`/admin/produk`)
- **shadcn:** Tabs, Table, Input, Select, Button, Badge, Sheet (form edit),
  DropdownMenu (aksi baris), Checkbox (bulk select), AlertDialog (konfirmasi
  bulk delete)
- **Custom:** `ProductTable` (pakai TanStack Table), `ProductFilterBar`,
  `BulkActionBar`, `EmptyState`
- **Layout:** `AdminLayout`

### 25. Form Produk (bertab: Umum, Barcode, Harga, Konversi, Stok Min-Maks)
- **shadcn:** Tabs, Card, Input, Label, Textarea, Select, Switch, Button,
  Form, Sheet
- **Custom:** `BarcodeInput` (dengan validasi format), `MultiPriceForm`,
  `UnitConversionForm`, `ImageUploader`
- **Layout:** modal Sheet dari AdminLayout
- **Validation:** react-hook-form + zod nested schema

(dan seterusnya untuk semua 45 halaman)
```

Isi lengkap untuk 45 halaman butuh 90–120 menit sendiri. **Jangan skip** —
ini kontrak Ziyad ke AI: "kalau kamu bikin halaman X, komponennya ini".

---

## 5. LAYOUT & DESIGN TOKEN

Sebelum peta selesai, definisikan **layout dan token warna** yang jadi
dasar semua halaman:

### Layout yang dibutuhkan

- `PublicLayout` — untuk storefront (mobile-first, header sederhana, footer info sekolah)
- `WaliLayout` — untuk portal wali (mobile-first, header dengan nama wali, bottom nav)
- `GuestLayout` — untuk halaman auth (center card, brand di atas)
- `AdminLayout` — sidebar + header + main (dari fase-ui-01)
- `PosLayout` — fullscreen kasir tanpa sidebar (fokus 100% ke kasir)

### Design token (CSS variable + Tailwind config)

Sudah didefinisikan di `fase-ui-01-perbaikan-navigasi.md` bagian 5.4.
Ringkasnya:

```css
:root {
  --surface: #FFFFFF;
  --bg: #F0F4FA;
  --border: #B9CBE5;
  --text: #0F1B33;
  --text-muted: #2E5490;
  --primary: #1B3A6B;
  /* ... */
}

.dark {
  --surface: #0F172A;
  --bg: #020617;
  /* ... */
}
```

Semua komponen shadcn yang di-install nanti wajib diubah agar pakai token
ini (`bg-surface`, `text-content`), bukan `bg-white dark:bg-slate-900`.

---

## 6. KOMPONEN CUSTOM WAJIB (TIDAK ADA DI shadcn)

Yang muncul berulang di banyak halaman — bangun sekali, pakai di mana-mana:

| Nama Komponen | Guna | Basis shadcn |
|---|---|---|
| `<Money amount={12500} />` | Format Rp 12.500 | span |
| `<MoneyInput />` | Input nominal dengan format otomatis | Input |
| `<StatCard label value trend />` | Kartu statistik dashboard | Card |
| `<PageHeader title breadcrumbs actions />` | Header halaman admin | Breadcrumb |
| `<EmptyState icon title description action />` | Placeholder kosong | Card |
| `<BulkActionBar />` | Bar aksi massal di atas tabel | Button + Separator |
| `<Tabs items lazy />` | Wrapper shadcn Tabs + query string | Tabs |
| `<DataTable columns data />` | Wrapper TanStack + shadcn Table | Table |
| `<DateRangePicker />` | Preset tanggal (Hari Ini, Minggu Ini, ...) | Calendar + Popover |
| `<FormField />` | Wrapper Form + validasi zod inline | Form |
| `<MemberCard member />` | Kartu anggota (foto, nama, saldo) | Card + Avatar |
| `<ProductCard product />` | Kartu produk untuk storefront & katalog | Card |
| `<Barcode128 value />` | Render barcode Code128 (JsBarcode) | canvas |
| `<PriceDisplay old new />` | Harga dengan strikethrough kalau ada promo | span |
| `<StockBadge status />` | Badge tersedia/habis (tidak angka) | Badge |
| `<PinInput length={6} />` | Input PIN 6-digit (satu kotak per digit) | Input |

Semua ini dibangun di **Fase 0** (fondasi), lalu dipakai di seluruh fase.

---

## CHECKLIST VERIFIKASI

- [ ] `docs/PETA-KOMPONEN.md` sudah dibuat
- [ ] Inventarisasi 45 halaman lengkap dengan komponen shadcn per halaman
- [ ] Komponen custom (16 di atas) sudah didaftar dengan basis shadcn-nya
- [ ] 5 layout (`PublicLayout`, `WaliLayout`, `GuestLayout`, `AdminLayout`,
      `PosLayout`) sudah didaftar
- [ ] Daftar install shadcn (~32 komponen) sudah rapi
- [ ] Daftar npm library tambahan (TanStack, Zustand, hotkeys, dst) sudah rapi
- [ ] Design token CSS variable sudah dirangkum ulang dari fase-ui-01
- [ ] Commit `docs: peta komponen shadcn` sudah dilakukan
- [ ] Push ke GitHub berhasil

---

**Setelah selesai → lanjut ke `pre-06-gerbang-siap-ngoding.md`.**
