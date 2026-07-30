# FASE UI-01 V2 — NAVIGASI, MODE GELAP & SISTEM TAB (REACT)

> **Konteks global di `README-v2.md`. Perbaikan wajib di
> `CATATAN-PERBAIKAN.md`.**

**Target:** navigasi admin terpusat & tersaring permission, mode gelap tanpa
kedipan, sistem tab reusable, scroll bersih.

**Prasyarat:** Fase 0 selesai (AdminLayout skeleton sudah ada).
**Estimasi:** 1 sesi (2–3 jam).

**Catatan:** fase ini dikerjakan SEBELUM Fase 1 supaya semua halaman modul
berikutnya langsung mengikuti struktur navigasi & token warna yang benar.
Kalau dikerjakan belakangan, 45 halaman harus di-refactor.

---

```
=== FASE UI-01 V2: NAVIGASI, MODE GELAP & TAB ===
Fase 0 sudah selesai. AdminLayout masih skeleton.

──────────────────────────────────────────────────────────────
BAGIAN 1 — PERBAIKAN SCROLL
──────────────────────────────────────────────────────────────

MASALAH UMUM: scroll bertumpuk (halaman scroll + main scroll +
tabel scroll) membuat pengalaman kacau, terutama di layar kecil.

ATURAN:
1. <html> dan <body> → h-full, overflow-hidden
2. AdminLayout root → h-screen flex
3. Sidebar → h-full overflow-y-auto (scroll sendiri bila menu panjang)
4. Kolom kanan → flex-1 flex flex-col min-w-0 (min-w-0 WAJIB, ini
   yang mencegah overflow horizontal pada flex child)
5. Header → shrink-0
6. Main → flex-1 overflow-y-auto (SATU-SATUNYA area yang scroll)
7. Tabel lebar → bungkus dalam <div className="overflow-x-auto">
   TIDAK boleh membiarkan tabel mendorong lebar halaman

Implementasi:
- resources/css/app.css tambahkan:
  html, body, #app { height: 100%; overflow: hidden; }
- AdminLayout.tsx struktur:
  <div className="flex h-screen bg-bg">
    <Sidebar />
    <div className="flex flex-1 flex-col min-w-0">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] p-6">{children}</div>
      </main>
    </div>
  </div>

- PosLayout.tsx: h-screen overflow-hidden, TIDAK ada scroll halaman.
  Area keranjang punya ScrollArea sendiri.

- PublicLayout & WaliLayout: BOLEH scroll halaman normal (bukan app-like),
  jadi html/body overflow-auto di layout ini. Gunakan class kondisional
  atau CSS scoped.

VERIFIKASI: buka halaman admin dengan tabel 100 baris dan 15 kolom.
Harus: satu scrollbar vertikal di main, satu scrollbar horizontal di
dalam wrapper tabel. Tidak ada scrollbar di body.

──────────────────────────────────────────────────────────────
BAGIAN 2 — KONSOLIDASI MENU (45 → 16)
──────────────────────────────────────────────────────────────

MASALAH: rencana 18 fase menghasilkan ~45 halaman admin. Kalau semua
jadi item sidebar, menu tidak terbaca.

SOLUSI: 16 menu utama, sisanya jadi TAB di dalam halaman.

STRUKTUR MENU FINAL:

┌─ DASHBOARD
│  └─ /admin  (isi berbeda per role)
│
├─ OPERASIONAL
│  ├─ Kasir           → /pos (buka di area terpisah)
│  ├─ Penjualan       → /admin/penjualan
│  │    tab: Riwayat · Retur · Void · Hold
│  ├─ Deposit         → /admin/deposit
│  │    tab: Top-Up · Riwayat · Penarikan · Penyesuaian ·
│  │         Verifikasi Transfer · Saldo Mengendap · Rekonsiliasi
│  └─ Kas & Sesi      → /admin/kas
│       tab: Sesi Aktif · Daftar Sesi · Buku Kas · Kas Masuk/Keluar ·
│            Drop & Setoran
│
├─ PERSEDIAAN
│  ├─ Produk          → /admin/produk
│  │    tab: Produk · Kategori · Brand · Satuan · Label Harga
│  ├─ Stok            → /admin/stok
│  │    tab: Ringkasan · Kartu Stok · Layer · Akan Kadaluwarsa ·
│  │         Stok Minimum · Slow Moving
│  ├─ Pembelian       → /admin/pembelian
│  │    tab: PO · Penerimaan · Daftar · Retur · Perubahan Harga
│  ├─ Konsinyasi      → /admin/konsinyasi
│  │    tab: Penerimaan · Terjual · Settlement · Retur
│  └─ Opname & Mutasi → /admin/opname
│       tab: Opname · Transfer · Penyesuaian · Write-Off
│
├─ KEANGGOTAAN
│  ├─ Anggota         → /admin/anggota
│  │    tab: Daftar · Kartu · Level · Arsip Lulus · Impor
│  └─ Promo & Poin    → /admin/promo
│       tab: Promo · Kupon · Poin · Ulang Tahun · Simulator
│
├─ KEUANGAN
│  ├─ Hutang & Piutang → /admin/hutang-piutang
│  │    tab: Hutang · Piutang · Aging · Potong Gaji
│  ├─ Jurnal           → /admin/jurnal
│  │    tab: Jurnal Umum · Buku Besar · Neraca Saldo · CoA ·
│  │         Periode · Validasi
│  └─ Laporan          → /admin/laporan
│       (grid kartu laporan, bukan tab)
│
└─ SISTEM
   ├─ Mitra & Outlet  → /admin/mitra
   │    tab: Supplier · Outlet · Metode Bayar · Akun Kas ·
   │         Kategori Kas
   ├─ Karyawan        → /admin/karyawan
   │    tab: Daftar · Shift · Absensi · Checklist Toko
   └─ Pengaturan      → /admin/pengaturan
        tab: Pengguna · Role & Izin · Log Aktivitas · Profil Toko ·
             Transaksi · Deposit · Struk · Promo · Inventori ·
             Notifikasi · Backup · Bahaya

TOTAL: 16 menu utama (1 dashboard + 15 modul), semua sub-halaman
jadi tab.

ATURAN KE DEPAN (masuk ke CLAUDE.md / dokumentasi):
"Halaman baru yang domainnya sama dengan menu yang sudah ada
ditambahkan sebagai TAB, bukan menu baru di sidebar."

──────────────────────────────────────────────────────────────
BAGIAN 3 — NAVIGASI TERPUSAT
──────────────────────────────────────────────────────────────

MASALAH: kalau menu ditulis langsung di React component, filtering
permission tersebar dan mudah bocor (menu tampil padahal tidak punya
izin, atau sebaliknya).

SOLUSI: satu sumber kebenaran di backend, dikirim lewat Inertia
shared props.

config/navigation.php:
  return [
    [
      'group' => 'Dashboard',
      'items' => [
        [
          'key' => 'dashboard',
          'label' => 'Dashboard',
          'route' => 'admin.dashboard',
          'icon' => 'LayoutDashboard',       // nama lucide-react
          'permissions' => [],                 // kosong = semua yang login
        ],
      ],
    ],
    [
      'group' => 'Operasional',
      'items' => [
        [
          'key' => 'pos',
          'label' => 'Kasir',
          'route' => 'pos.index',
          'icon' => 'ShoppingCart',
          'permissions' => ['pos.view'],
          'target' => '_self',
          'highlight' => true,   // tombol menonjol, bukan item biasa
        ],
        [
          'key' => 'penjualan',
          'label' => 'Penjualan',
          'route' => 'admin.penjualan.index',
          'icon' => 'Receipt',
          'permissions' => ['sale.view'],
        ],
        [
          'key' => 'deposit',
          'label' => 'Deposit',
          'route' => 'admin.deposit.index',
          'icon' => 'Wallet',
          'permissions' => ['deposit.view', 'topup.view'],
          'badge' => 'pending_topup',   // key untuk badge dinamis
        ],
        ...
      ],
    ],
    ... (dan seterusnya untuk 5 grup)
  ];

app/Services/NavigationService.php:
  public function forUser(User $user): array
      → Baca config('navigation')
      → Filter item: user harus punya MINIMAL SATU permission
        dari array 'permissions' (OR, bukan AND)
      → Item dengan permissions kosong → selalu tampil (yang login)
      → Buang grup yang jadi kosong setelah filter
      → Resolve route() jadi URL absolut
      → Isi badge dinamis (jumlah top-up pending, PO menunggu
        approval, dsb) — dengan cache 60 detik agar tidak query
        setiap request
      → Return array siap konsumsi React

HandleInertiaRequests, tambahkan ke share():
  'navigation' => fn() => $request->user()
      ? app(NavigationService::class)->forUser($request->user())
      : [],

React Sidebar.tsx:
  const { navigation } = usePage<PageProps>().props
  → Render dari data ini. TIDAK ADA menu hardcoded di React.
  → Ikon di-resolve dari string ke komponen lucide:
    import * as Icons from 'lucide-react'
    const Icon = Icons[item.icon as keyof typeof Icons]

ATURAN KE DEPAN:
"Menu baru didaftarkan di config/navigation.php dengan key
'permissions'. JANGAN menulis menu langsung di React component."

──────────────────────────────────────────────────────────────
BAGIAN 4 — SIDEBAR & PERMISSION
──────────────────────────────────────────────────────────────

Sidebar.tsx harus mendukung:

1. LIPAT/BENTANG
   - Lebar bentang: 260px. Lebar lipat: 68px (ikon saja).
   - Tombol toggle di footer sidebar.
   - Saat terlipat: hover ikon → Tooltip label (shadcn Tooltip).
   - State disimpan di useSidebarStore (Zustand + localStorage).

2. GRUP BISA BUKA-TUTUP
   - Klik header grup → collapse/expand item di bawahnya.
   - Grup yang berisi halaman aktif → otomatis terbuka.
   - State openGroups[] di useSidebarStore.

3. INDIKATOR HALAMAN AKTIF
   - Item aktif: bg-navy-700, border-l-4 border-gold, text-white
   - Deteksi aktif: bandingkan `route().current(item.route + '*')`
     supaya sub-route (tab) tetap menandai menu induk aktif.

4. BADGE DINAMIS
   - Item dengan 'badge' key → tampilkan Badge shadcn dengan angka.
   - Contoh: Deposit → "3" (3 top-up menunggu verifikasi).
   - Sembunyikan bila 0.

5. RESPONSIF
   - < 1024px: sidebar jadi Sheet (shadcn) yang slide dari kiri.
   - Tombol hamburger di header.
   - Sheet menutup otomatis setelah navigasi.

6. FOOTER SIDEBAR
   - Nama outlet aktif (bila user punya akses banyak outlet:
     dropdown pemilih outlet).
   - Tombol lipat/bentang.

PERMISSION DI TIGA LAPIS (WAJIB SEMUA):
   Lapis 1 — Sidebar: item tidak ditampilkan (NavigationService)
   Lapis 2 — Route: middleware 'permission:xxx' di routes/admin.php
   Lapis 3 — Policy: authorize() di controller

   Menyembunyikan menu SAJA tidak cukup. User bisa ketik URL langsung.

VERIFIKASI: login bergantian sebagai owner, admin, supervisor,
cashier, warehouse, treasurer. Menu yang tampil harus sesuai peta role
di README-v2.md. Tidak boleh ada header grup yang kosong.

──────────────────────────────────────────────────────────────
BAGIAN 5 — MODE GELAP DENGAN TOKEN CSS
──────────────────────────────────────────────────────────────

MASALAH: menulis `dark:` di setiap elemen tidak terkelola. Ratusan
komponen, mudah terlewat, sulit diubah.

SOLUSI: CSS variable + satu class .dark di <html>.

5.1 DEFINISI TOKEN

resources/css/app.css:

@layer base {
  :root {
    /* Format: R G B tanpa koma, supaya bisa /<alpha-value> */
    --surface:      255 255 255;   /* kartu, panel */
    --surface-alt:  240 244 250;   /* zebra, hover */
    --bg:           240 244 250;   /* latar halaman */
    --border:       185 203 229;
    --border-strong:138 166 209;
    --text:          15  27  51;
    --text-muted:    46  84 144;
    --text-subtle:  138 166 209;
    --primary:       27  58 107;
    --primary-fg:   255 255 255;
    --accent:       201 162  39;   /* gold */
    --success:       30 122  76;
    --warning:      199 119   0;
    --danger:       179  38  30;
    --sidebar:       27  42  74;   /* navy-800 */
    --sidebar-fg:   220 229 242;
    --sidebar-active: 21  46  86;  /* navy-700 */
  }

  .dark {
    --surface:       15  23  42;   /* slate-900 tapi kebiruan navy */
    --surface-alt:   21  46  86;
    --bg:             2   6  23;
    --border:        21  46  86;
    --border-strong: 46  84 144;
    --text:         226 232 240;
    --text-muted:   148 163 184;
    --text-subtle:  100 116 139;
    --primary:      138 166 209;   /* navy-300, lebih terang di gelap */
    --primary-fg:    15  27  51;
    --accent:       218 185  84;   /* gold lebih terang */
    --success:       52 168 110;
    --warning:      230 150  30;
    --danger:       220  80  70;
    --sidebar:       15  27  51;
    --sidebar-fg:   203 213 225;
    --sidebar-active: 27  58 107;
  }
}

5.2 PEMETAAN KE TAILWIND

tailwind.config.js theme.extend.colors (sudah disiapkan di Fase 0):
  surface: 'rgb(var(--surface) / <alpha-value>)',
  'surface-alt': 'rgb(var(--surface-alt) / <alpha-value>)',
  bg: 'rgb(var(--bg) / <alpha-value>)',
  border: 'rgb(var(--border) / <alpha-value>)',
  'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
  content: 'rgb(var(--text) / <alpha-value>)',
  'content-muted': 'rgb(var(--text-muted) / <alpha-value>)',
  'content-subtle': 'rgb(var(--text-subtle) / <alpha-value>)',
  primary: 'rgb(var(--primary) / <alpha-value>)',
  'primary-fg': 'rgb(var(--primary-fg) / <alpha-value>)',
  accent: 'rgb(var(--accent) / <alpha-value>)',
  sidebar: 'rgb(var(--sidebar) / <alpha-value>)',
  'sidebar-fg': 'rgb(var(--sidebar-fg) / <alpha-value>)',
  'sidebar-active': 'rgb(var(--sidebar-active) / <alpha-value>)',

5.3 PEMETAAN VARIABEL SHADCN KE TOKEN KITA

shadcn/ui memakai variabel sendiri. Petakan supaya semua komponen
shadcn otomatis ikut tema kita TANPA edit satu-per-satu:

@layer base {
  :root {
    --background: var(--bg);
    --foreground: var(--text);
    --card: var(--surface);
    --card-foreground: var(--text);
    --popover: var(--surface);
    --popover-foreground: var(--text);
    --primary: var(--primary);
    --primary-foreground: var(--primary-fg);
    --secondary: var(--surface-alt);
    --secondary-foreground: var(--text);
    --muted: var(--surface-alt);
    --muted-foreground: var(--text-muted);
    --accent: var(--surface-alt);
    --accent-foreground: var(--text);
    --destructive: var(--danger);
    --destructive-foreground: 255 255 255;
    --border: var(--border);
    --input: var(--border);
    --ring: var(--primary);
  }
}

Dengan ini, semua komponen shadcn (Button, Card, Dialog, dst) otomatis
mengikuti tema — tanpa perlu edit file komponennya satu-satu.

5.4 MENCEGAH KEDIPAN PUTIH (FOUC)

Skrip inline di <head> app.blade.php, SEBELUM CSS di-load:

<script>
  (function () {
    try {
      var t = localStorage.getItem('theme');
      var sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (t === 'dark' || (t !== 'light' && sys)) {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {}
  })();
</script>

Ini WAJIB inline dan blocking. Kalau di-load lewat JS bundle, akan
tetap kedip putih sepersekian detik.

5.5 STORE & HOOK REACT

useThemeStore.ts (Zustand):
  theme: 'light' | 'dark' | 'system'
  resolved: 'light' | 'dark'   ← hasil resolusi 'system'
  setTheme(t)  → simpan localStorage, toggle class .dark di <html>
  init()       → panggil sekali di app.tsx, listen ke perubahan
                 prefers-color-scheme bila theme === 'system'

useTheme.ts (hook):
  const { theme, resolved, setTheme } = useThemeStore()
  → Dipakai komponen yang butuh tahu tema (misal: chart recharts)

ThemeToggle.tsx (komponen):
  → DropdownMenu shadcn dengan 3 pilihan: Terang · Gelap · Sistem
  → Ikon: Sun / Moon / Monitor dari lucide-react
  → Ditaruh di header AdminLayout, PosLayout, PublicLayout, WaliLayout

5.6 PENGECUALIAN — YANG TETAP PUTIH

Struk PDF dan laporan cetak TIDAK mengikuti mode gelap. Selalu
latar putih, teks hitam. Blade template di resources/views/pdf/
pakai CSS terpisah tanpa CSS variable kita.

Alasan: printer thermal dan kertas selalu putih.

5.7 ATURAN KE DEPAN

Masuk ke dokumentasi proyek:
"Warna memakai token: bg-surface, text-content, border-border.
JANGAN menulis warna langsung (bg-white, bg-slate-900) atau
dark: per elemen."

Kecuali:
- Sidebar (pakai bg-sidebar, text-sidebar-fg)
- Badge status semantik (pakai success/warning/danger)
- Struk PDF (putih permanen)

──────────────────────────────────────────────────────────────
BAGIAN 6 — SISTEM TAB REUSABLE
──────────────────────────────────────────────────────────────

Karena 15 dari 16 menu punya tab, buat komponen sekali pakai
di mana-mana.

resources/js/Components/common/PageTabs.tsx:

Props:
  tabs: Array<{
    key: string
    label: string
    href: string          // URL Inertia
    permission?: string   // sembunyikan bila tidak punya
    badge?: number
  }>
  current: string

Perilaku:
- Render dengan <Tabs> shadcn (Radix) untuk aksesibilitas + keyboard nav
- Navigasi antar-tab pakai Inertia router.visit dengan
  preserveScroll: true, preserveState: false
- Tab aktif ditentukan oleh prop `current` dari controller
  (bukan client-side state) — supaya refresh & deep-link bekerja
- Tab yang user tidak punya permission → tidak dirender
- Responsif: < 768px jadi scrollable horizontal dengan
  fade indicator di kanan-kiri
- Sinkron dengan URL: tiap tab punya URL sendiri, bukan query param
  (SEO & bookmark friendly, dan konsisten dengan Inertia)

Pola pemakaian di halaman admin:

  export default function ProdukIndex({ products, tab }: Props) {
    return (
      <AdminLayout>
        <PageHeader title="Produk" breadcrumbs={[...]} />
        <PageTabs current={tab} tabs={[
          { key: 'produk', label: 'Produk', href: route('admin.produk.index') },
          { key: 'kategori', label: 'Kategori', href: route('admin.kategori.index'),
            permission: 'category.view' },
          ...
        ]} />
        <div className="mt-6">
          <DataTable ... />
        </div>
      </AdminLayout>
    )
  }

Backend: setiap controller tab mengirim prop `tab` dengan key-nya.

ATURAN KE DEPAN:
"Halaman bertab memakai <PageTabs>. Jangan ditulis ulang per halaman."

──────────────────────────────────────────────────────────────
BAGIAN 7 — HEADER ADMIN
──────────────────────────────────────────────────────────────

Header.tsx (dalam AdminLayout):

Kiri:
- Tombol hamburger (hanya < 1024px)
- Breadcrumb (dari PageHeader, atau judul halaman)

Kanan:
- Pencarian global (Command shadcn, Ctrl+K)
  → cari produk, anggota, nota. Implementasi lengkap di Fase 15,
    di fase ini cukup UI + placeholder.
- Notifikasi (lonceng + badge jumlah)
  → dropdown panel. Isi lengkap di Fase 15.
- ThemeToggle
- Profil dropdown: nama, role, avatar
  → menu: Profil · Ganti PIN · Keluar

Header bg-sidebar dengan text-sidebar-fg (senada dengan sidebar,
memberi kesan satu kesatuan navy).

──────────────────────────────────────────────────────────────
BAGIAN 8 — HALAMAN UJI NAVIGASI
──────────────────────────────────────────────────────────────

Perbarui /uji-komponen dari Fase 0, tambahkan:
- Demo PageTabs dengan 5 tab dummy
- Demo semua token warna (kotak warna dengan nama token)
- Demo ThemeToggle
- Info: tema saat ini, sidebar collapsed atau tidak

Buat juga halaman dummy untuk 16 menu (isi placeholder
"Halaman ini akan dibuat di Fase N") supaya navigasi bisa diuji
penuh tanpa menunggu semua fase selesai.

──────────────────────────────────────────────────────────────
CHECKLIST VERIFIKASI
──────────────────────────────────────────────────────────────

SCROLL
□ Buka halaman admin dengan tabel 100 baris → HANYA satu scrollbar
  vertikal (di main), tidak ada di body
□ Tabel 15 kolom → scrollbar horizontal ADA DI DALAM wrapper tabel,
  tidak mendorong lebar halaman
□ Layar kasir (/pos dummy) → tidak ada scroll halaman sama sekali
□ Halaman publik (/) → scroll halaman normal (ini disengaja)

NAVIGASI
□ config/navigation.php ada dengan 5 grup, 16 item
□ NavigationService::forUser() bekerja
□ Login sebagai owner → 16 menu tampil
□ Login sebagai cashier → hanya menu yang boleh (Dashboard, Kasir,
  Penjualan terbatas, Deposit terbatas, Kas & Sesi)
□ Login sebagai warehouse → tidak ada menu Kasir, Jurnal, Pengaturan
□ Login sebagai treasurer → tidak ada menu Kasir
□ TIDAK ADA header grup yang kosong (grup tanpa item terfilter habis)
□ Ketik URL /admin/jurnal sebagai cashier → 403 (bukan hanya menu
  disembunyikan)

SIDEBAR
□ Klik tombol lipat → sidebar jadi 68px, hanya ikon
□ Hover ikon saat terlipat → Tooltip label muncul
□ Refresh halaman → status lipat tetap (localStorage)
□ Klik header grup → item di bawahnya collapse
□ Buka halaman di grup tertutup → grup otomatis terbuka
□ Resize < 1024px → sidebar jadi Sheet drawer
□ Klik menu di Sheet → navigasi jalan, Sheet tertutup otomatis
□ Halaman aktif ditandai bg-navy-700 + border kiri gold

MODE GELAP
□ Toggle ke Gelap → seluruh UI berubah
□ Refresh halaman → TIDAK ADA kedipan putih sama sekali
□ Pilih "Sistem" → ikuti pengaturan OS
□ Ubah tema OS saat mode "Sistem" → UI ikut berubah tanpa refresh
□ Semua komponen shadcn (Button, Card, Dialog, Select, Table)
  ikut berubah tanpa edit manual
□ Sidebar tetap navy di kedua mode (tidak jadi putih)
□ Kontras teks di mode gelap memadai (uji dengan alat kontras,
  minimal WCAG AA 4.5:1)

TAB
□ <PageTabs> render dengan Radix Tabs
□ Klik tab → URL berubah, konten berganti, scroll tetap di posisi
□ Refresh di tab tertentu → tab itu yang aktif (bukan kembali ke
  tab pertama)
□ Tab dengan permission yang tidak dimiliki → tidak dirender
□ < 768px → tab scrollable horizontal

TOKEN
□ Cari di seluruh resources/js: TIDAK ADA `bg-white`, `bg-slate-`,
  `text-gray-`, `dark:` (kecuali di komponen ui/ shadcn yang memang
  memakai variabel, dan di PDF template)
  Perintah cek:
    grep -rn "dark:" resources/js --include="*.tsx" | grep -v "Components/ui"
  Hasilnya harus kosong atau sangat sedikit dengan alasan jelas.

Setelah semua lolos → commit:
  git commit -m "Fase UI-01: navigasi terpusat, mode gelap token, sistem tab"
```

---

## CATATAN UNTUK ZIYAD

**Kenapa fase ini dikerjakan lebih dulu (sebelum Fase 1):**

Kalau dikerjakan setelah beberapa modul jadi, Pak harus refactor semua
halaman yang sudah ditulis. Dengan mengerjakannya sekarang, setiap halaman
di Fase 1–19 langsung lahir dengan struktur yang benar.

**Bagian yang paling menentukan: 5.3 (pemetaan variabel shadcn).**

Kalau ini benar, semua komponen shadcn yang di-install kapan pun akan
otomatis ikut tema. Kalau salah, Pak akan edit puluhan file komponen
satu-satu. Investasi 20 menit di sini menghemat berjam-jam nanti.

**Grep test di akhir checklist itu penting.** Jalankan berkala selama
proyek berjalan — kalau `dark:` mulai bermunculan lagi, artinya disiplin
token mulai bocor.

---

*Fase UI-01 V2 — Skillage Mart POS*
