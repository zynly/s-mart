# PETA KOMPONEN — Skillage Mart POS

Untuk setiap halaman: komponen shadcn/ui yang dipakai, komponen custom
(yang sudah ada dari Fase 0, dan yang masih perlu dibangun saat fase
terkait dikerjakan), layout, dan catatan state/validasi.

Ditulis **retroaktif** — shadcn/ui dan 11 komponen custom fondasi
**sudah terpasang nyata** di Fase 0 (bukan rencana, sudah kode berjalan).
Peta per halaman di bawah ini yang menyusun rencana pemakaiannya untuk
Fase 1–19.

---

## 1. Inventarisasi Halaman (45 + modal)

Sama seperti direncanakan `pre-05-peta-shadcn.md`, disesuaikan dengan
struktur route final (`/`, `/wali`, `/pos`, `/admin`).

---

## 2. Komponen shadcn/ui Terpasang (32)

Sudah di-install nyata di Fase 0 dengan basis **Radix** (ADR-0001),
alias `@/Components/ui`:

accordion · alert · alert-dialog · avatar · badge · breadcrumb · button ·
calendar · card · checkbox · command · dialog · dropdown-menu · field
*(pengganti modern "form")* · input · input-group · label ·
navigation-menu · pagination · popover · progress · radio-group ·
resizable · scroll-area · select · separator · sheet · skeleton · sonner
· switch · table · tabs · textarea · tooltip

Tidak ada `date-picker`, `sidebar`, `toast`, `hover-card`, `context-menu`,
`carousel` terpisah dari rencana pre-05 — `date-picker` dan preset
tanggal digantikan `DateRangePicker` custom (Calendar + Popover), sidebar
dibangun manual di `AdminLayout` (bukan komponen `sidebar` shadcn, supaya
kontrol penuh atas collapse/drawer behavior), `toast` diganti `sonner`
saja (tidak dua-duanya), sisanya (hover-card, context-menu, carousel)
ditunda — install saat halaman yang butuh benar-benar dikerjakan
(storefront banner di Fase 19 kandidat `carousel`).

## 3. Library Tambahan Terpasang (bukan shadcn)

`@tanstack/react-table` · `zustand` · `react-hotkeys-hook` ·
`react-hook-form` + `@hookform/resolvers` + `zod` · `date-fns` ·
`recharts` · `lucide-react` · `jsbarcode` · `clsx` + `tailwind-merge` +
`class-variance-authority` · `sonner` · `ziggy-js` · `@fontsource/inter`
+ `@fontsource/jetbrains-mono`.

`@tanstack/react-query` (direncanakan pre-05) **tidak** dipasang di Fase
0 — aturan kode #19 (`README-v2.md`) menegaskan Inertia router dipakai
untuk operasi utama; TanStack Query baru dipasang saat benar-benar ada
kebutuhan polling ringan (notifikasi/status), bukan dari awal.

---

## 4. Peta Komponen per Halaman

### STOREFRONT PUBLIK

**1. Beranda (`/`)**
- shadcn: Card, Button, Badge
- Custom: `PageHeader` tidak dipakai (bukan halaman admin); custom
  domain (`ProductCard`, `PromoBanner`, `CategoryPills`) — **belum
  dibangun**, menyusul Fase 19 (T-112/T-113)
- Layout: `PublicLayout` ✅ ada sejak Fase 0
- Catatan: halaman uji `Public/Welcome.tsx` sudah jadi kerangka awal —
  akan diperluas jadi beranda storefront penuh di Fase 19

**2. Katalog Produk (`/produk`)**
- shadcn: Input (search), Select (kategori), Badge, Pagination, Card, Skeleton
- Custom fondasi: `EmptyState` ✅, `Money` ✅ (untuk harga)
- Custom domain baru: `ProductCard`, `ProductFilterBar`, `StockBadge` —
  Fase 19 (T-112)
- Layout: `PublicLayout`
- Catatan: stok **tidak** tampil angka, hanya badge Tersedia/Habis (ADR-0009)

**3. Detail Produk (`/produk/{slug}`)**
- shadcn: Card, Badge, Button, Tabs, Alert
- Custom domain baru: `ProductGallery`, `RelatedProducts` — Fase 19
- Layout: `PublicLayout`

**4. Halaman Promo (`/promo`)**
- shadcn: Card, Badge
- Custom domain baru: `PromoBanner` — Fase 19 (T-113), sumber
  `promos.is_public`

**5–7. Tentang / Kontak / FAQ**
- shadcn: Card, Accordion (FAQ)
- Layout: `PublicLayout` — konten statis, tanpa komponen domain baru

**8. Cek Saldo Kiosk (`/cek-saldo`)**
- shadcn: Card, Input, Button, Alert
- Custom fondasi: `Money` ✅, `PinInput` ✅ (opsional bila diberi PIN)
- Fase 19 (T-114)

### AUTH

**9. Login Staff (`/login`)**
- shadcn: Card, Input, Label, Button, Field, Alert
- Custom: `AuthLogo` — komponen kecil, dibuat saat T-009
- Layout: `GuestLayout` ✅ ada sejak Fase 0
- Validasi: react-hook-form + zod; rate limit 5x/menit/IP (T-011)

**10. Login Wali (`/wali/login`)**
- Sama dengan #9, `WaliLayout` ✅, input nomor HP format Indonesia — T-096

**11. Lupa Password**
- shadcn: Card, Input, Label, Button, Field — bawaan Fortify (T-001), tinggal styling

### PORTAL WALI

**12. Beranda Wali (`/wali`)**
- shadcn: Card, Avatar, Badge, Separator, Button
- Custom domain baru: `KartuAnak`, `RingkasanSaldo` — Fase 16 (T-097)
- Custom fondasi: `Money` ✅
- Layout: `WaliLayout` ✅

**13. Detail Anak (`/wali/anak/{id}`)**
- shadcn: Card, Tabs, Badge, Table
- Custom domain baru: `GrafikPemakaian` (recharts), `RiwayatBelanjaList` — Fase 16
- Custom fondasi: `DataTable` ✅ (untuk riwayat belanja)

**14. Ajukan Top-Up (`/wali/top-up`)**
- shadcn: Card, Input, Label, Button, Field, Tabs, RadioGroup, Alert
- Custom fondasi: `MoneyInput` ✅
- Custom domain baru: `NominalCepat`, `UnggahBukti` — Fase 16 (T-097)
- Validasi: zod (nominal min `deposit_min_topup`, file bukti wajib)

**15. Pengaturan Notifikasi Wali**
- shadcn: Card, Switch, Button — Fase 16

### KASIR (`/pos`)

**16. Layar Kasir Utama**
- shadcn: Input (barcode), Card, Table, Button, Badge, ScrollArea, Resizable
- Custom fondasi: `Money` ✅
- Custom domain baru: `CartTable`, `TotalPanel`, `MemberPanel`,
  `FavoriteProductGrid`, `HotkeyBar`, `StatusBar` — Fase 8 (T-049)
- Layout: `PosLayout` ✅ ada sejak Fase 0
- State: `useCartStore` ✅ skeleton ada, diisi penuh di T-049;
  `useSessionStore` baru — Fase 7/8
- Hotkey: `react-hotkeys-hook` ✅ terpasang, F1–F11 diimplementasi T-049
- Catatan: auto-focus input barcode setelah **setiap** aksi

**17. Modal Pembayaran Multi-Metode**
- shadcn: Dialog, Button, Input, Tabs, Badge, Alert, Separator
- Custom domain baru: `PaymentMethodPicker`, `PaymentBreakdown`,
  `SplitPaymentList` — Fase 9 (T-058)

**18. Modal Identifikasi Anggota**
- shadcn: Dialog, Input, Command (pencarian cepat), Avatar, Badge
- Custom fondasi: `Money` ✅ (tampil saldo)
- Fase 8 (T-050)

**19. Modal PIN Supervisor**
- shadcn: Dialog
- Custom fondasi: `PinInput` ✅ — tinggal dirangkai jadi modal saat T-008

**20. Modal Hold & Recall**
- shadcn: Dialog, Table, Button, Badge
- Custom fondasi: `DataTable` ✅, `EmptyState` ✅ — Fase 8 (T-052)

**21. Modal Buka/Tutup Sesi**
- shadcn: Dialog, Input, Button, Alert
- Custom fondasi: `MoneyInput` ✅, `ConfirmDialog` ✅
- Fase 7 (T-046) — panel hitung fisik per pecahan uang: custom baru
  `CashCountPanel`

**22. Modal Kas Masuk/Keluar/Drop**
- shadcn: Dialog, Input, Select, Button, Field
- Custom fondasi: `MoneyInput` ✅ — Fase 7 (T-046)

### ADMIN

**23. Dashboard per Role**
- shadcn: Card, Badge
- Custom fondasi: `StatCard` ✅, `PageHeader` ✅
- Custom domain baru: wrapper chart recharts dark-mode aware — Fase 15 (T-093)
- Layout: `AdminLayout` ✅

**24. Produk (`/admin/produk`, tab: Produk/Kategori/Brand/Satuan)**
- shadcn: Tabs, Table, Input, Select, Button, Badge, Sheet, DropdownMenu,
  Checkbox, AlertDialog
- Custom fondasi: `DataTable` ✅ (TanStack), `BulkActionBar` ✅,
  `EmptyState` ✅, `PageHeader` ✅, `ConfirmDialog` ✅
- Fase 2 (T-017)

**25. Form Produk (bertab: Umum, Barcode, Harga, Konversi, Stok)**
- shadcn: Tabs, Card, Input, Label, Textarea, Select, Switch, Button,
  Field, Sheet
- Custom domain baru: `BarcodeInput`, `MultiPriceForm`,
  `UnitConversionForm`, `ImageUploader` — Fase 2 (T-017)

**26–28. Anggota, Form Anggota, Cetak Kartu**
- shadcn: Tabs, Table, Card, Input, Select, Button, Sheet, DropdownMenu
- Custom fondasi: `DataTable` ✅, `PinInput` ✅ (reset PIN), `Money` ✅ (saldo)
- Custom domain baru: `MemberCard`, `Barcode128` (jsbarcode ✅ terpasang,
  wrapper komponennya dibuat saat T-022)
- Fase 3 (T-023, T-022)

**29. Deposit (tab: Top-Up, Riwayat, Penarikan, Penyesuaian, Verifikasi, Rekonsiliasi)**
- shadcn: Tabs, Table, Input, Button, Dialog, Badge
- Custom fondasi: `MoneyInput` ✅, `Money` ✅, `DataTable` ✅,
  `DateRangePicker` ✅
- Fase 4 (T-028)

**30. Sesi & Kas (tab: Sesi Kasir, Buku Kas, Daftar Sesi)**
- shadcn: Tabs, Table, Card, Badge
- Custom fondasi: `DataTable` ✅, `Money` ✅, `StatCard` ✅
- Fase 7 (T-046)

**31. Penjualan (tab: Riwayat, Retur, Void)**
- shadcn: Tabs, Table, Dialog, AlertDialog, Badge
- Custom fondasi: `DataTable` ✅, `Money` ✅, `ConfirmDialog` ✅
  (PIN supervisor untuk void)
- Fase 8/11 (T-072)

**32–33. Pembelian & Konsinyasi**
- shadcn: Tabs, Table, Card, Input, Select, Button, Sheet
- Custom fondasi: `DataTable` ✅, `Money` ✅, `BulkActionBar` ✅
- Fase 6 (T-041, T-042)

**34. Stok (dengan chip filter)**
- shadcn: Table, Badge, Select, ScrollArea
- Custom fondasi: `DataTable` ✅, `EmptyState` ✅
- Custom domain baru: `StockBadge`, chip filter kadaluwarsa — Fase 5 (T-035)

**35–36. Opname & Transfer, Wizard Opname**
- shadcn: Tabs, Table, Card, Button, Progress (indikator wizard step)
- Custom fondasi: `DataTable` ✅, `ConfirmDialog` ✅
- Fase 12 (T-077) — wizard 5 tahap (draft→counting→review→approved→posted)

**37. Hutang & Piutang (tab: Hutang, Piutang, Aging)**
- shadcn: Tabs, Table, Card, Badge
- Custom fondasi: `DataTable` ✅, `Money` ✅, `StatCard` ✅ (ringkasan aging)
- Fase 9 (T-060)

**38. Jurnal (tab: Jurnal Umum, Buku Besar, Neraca Saldo, CoA)**
- shadcn: Tabs, Table, Card
- Custom fondasi: `DataTable` ✅, `Money` ✅
- Fase 13 (T-083)

**39–40. Laporan (grid kartu) & Report Viewer Generik**
- shadcn: Card, Tabs, Select
- Custom fondasi: `StatCard` ✅, `DataTable` ✅, `DateRangePicker` ✅
- Fase 14 (T-084 `BaseReport` — report viewer generik reuse untuk 20 laporan)

**41–42. Diskon & Promo, Simulator Diskon**
- shadcn: Tabs, Table, Card, Input, Switch
- Custom fondasi: `DataTable` ✅, `Money` ✅
- Custom domain baru: `PriceDisplay` (strikethrough saat ada promo),
  simulator form — Fase 10 (T-067)

**43. Mitra & Outlet**
- shadcn: Tabs, Table, Card, Input, Select
- Custom fondasi: `DataTable` ✅ — data master, Fase 2/6

**44. Pengaturan (tab: Pengguna, Role & Izin, Log Aktivitas, Konfigurasi)**
- shadcn: Tabs, Table, Card, Checkbox (matriks permission), Input, Switch
- Custom fondasi: `DataTable` ✅, `ConfirmDialog` ✅ (konfirmasi bahaya —
  ketik nama toko + password, T-104)
- Fase 1 (T-009) & Fase 17 (T-103)

**45. Profil Pengguna**
- shadcn: Card, Input, Label, Button, Field, Avatar
- Fase 1 (T-009)

---

## 5. Layout & Design Token — Status

Semua 5 layout **sudah dibangun nyata** di Fase 0 (T-003):

| Layout | Status | Catatan |
|---|---|---|
| `PublicLayout` | ✅ | mobile-first, nav + Portal Wali, footer sekolah |
| `WaliLayout` | ✅ | mobile-first, bottom nav 4 item |
| `GuestLayout` | ✅ | center card, gradien navy |
| `AdminLayout` | ✅ skeleton | sidebar collapsible, drawer <1024px — menu penuh di Fase UI-01 (T-116) |
| `PosLayout` | ✅ | fullscreen, header tipis, 100vh tanpa scroll |

Design token (dieksekusi berbeda dari draf awal pre-05 — lihat ADR-0001):
bukan `tailwind.config.js` JS-based, melainkan `@theme`/`@theme inline`
CSS-first di `resources/css/app.css` (Tailwind v4). Nilai token sama
persis (navy scale, gold, teal, semantik), dark mode via
`@custom-variant dark (&:where(.dark, .dark *))`. Semua komponen shadcn
sudah dipetakan ke token ini sejak instalasi (T-002) — tidak ada
`bg-white`/`dark:bg-slate-900` di `Components/ui/`.

---

## 6. Komponen Custom Fondasi — Status Nyata

11 dari 16 komponen custom yang direncanakan pre-05 **sudah dibangun**
di Fase 0 (T-005). Nama/cakupan sedikit berbeda dari draf awal karena
mengikuti `fase-00-v2.md` §12 (versi final), bukan draf pre-05:

| Komponen | Status | Basis shadcn |
|---|---|---|
| `Money` | ✅ | span, font-mono |
| `MoneyInput` | ✅ | Input |
| `PageHeader` | ✅ | Breadcrumb |
| `StatCard` | ✅ | Card |
| `EmptyState` | ✅ | — |
| `DataTable` | ✅ | Table + TanStack Table |
| `BulkActionBar` | ✅ | Button + Separator |
| `DateRangePicker` | ✅ | Calendar + Popover |
| `PinInput` | ✅ | input mentah (bukan dari shadcn) |
| `ConfirmDialog` | ✅ | AlertDialog |
| `LoadingOverlay` | ✅ | — |

Komponen domain (page-specific) yang **belum dibangun** — dibuat saat
fase halaman terkait mulai dikerjakan, bukan di muka:
`MemberCard`, `ProductCard`, `Barcode128`, `PriceDisplay`, `StockBadge`,
`ProductGallery`, `RelatedProducts`, `PromoBanner`, `CategoryPills`,
`KartuAnak`, `RingkasanSaldo`, `GrafikPemakaian`, `RiwayatBelanjaList`,
`NominalCepat`, `UnggahBukti`, `CartTable`, `TotalPanel`, `MemberPanel`,
`FavoriteProductGrid`, `HotkeyBar`, `StatusBar`, `PaymentMethodPicker`,
`PaymentBreakdown`, `SplitPaymentList`, `BarcodeInput`, `MultiPriceForm`,
`UnitConversionForm`, `ImageUploader`, `CashCountPanel`, `AuthLogo`.

Catatan: `<Tabs items lazy />` dan `<FormField />` dari draf pre-05
**tidak dibangun sebagai wrapper terpisah** — dipakai langsung
`Tabs`/`Field` shadcn (T-002's `field.tsx`, pengganti modern "form"
component klasik), tidak butuh lapisan pembungkus tambahan.

---

*Peta ini hidup — perbarui saat komponen domain baru dibangun di
fase-fase berikutnya. Cek komponen fondasi di sini sebelum menulis
komponen custom baru — jangan duplikasi.*
