# FASE 0 V2 — FONDASI PROYEK (INERTIA + REACT + TYPESCRIPT)

> **Konteks global ada di `README-v2.md`. Perbaikan wajib ada di
> `CATATAN-PERBAIKAN.md`. Keduanya dibaca lebih dulu.**

**Target:** kerangka aplikasi berjalan — Laravel 12 + Inertia + React + TS +
shadcn/ui + Tailwind. Layout untuk 5 area siap. Belum ada fitur bisnis.

**Estimasi:** 1 sesi penuh (2–4 jam).

---

```
=== FASE 0 V2: FONDASI PROYEK ===

Bangun kerangka awal aplikasi Skillage Mart POS.
Tidak ada fitur bisnis di fase ini.

──────────────────────────────────────────────────────────────
1. INSTALASI LARAVEL 12
──────────────────────────────────────────────────────────────

Buat proyek di C:\laragon\www\skillage-mart (folder docs/ dan prompts/
sudah ada dari tahap pre-coding — JANGAN dihapus).

Perintah:
  composer create-project laravel/laravel:^12.0 . --prefer-dist

Bila folder tidak kosong, install ke folder sementara lalu pindahkan
isinya, dengan tetap mempertahankan docs/ dan prompts/.

.env yang dipakai (Laragon lokal):
  APP_NAME="Skillage Mart"
  APP_ENV=local
  APP_DEBUG=true
  APP_URL=http://skillage-mart.test
  APP_TIMEZONE=Asia/Jakarta
  APP_LOCALE=id
  APP_FALLBACK_LOCALE=en

  DB_CONNECTION=mysql
  DB_HOST=127.0.0.1
  DB_PORT=3306
  DB_DATABASE=skillage_mart_dev
  DB_USERNAME=root
  DB_PASSWORD=

  CACHE_STORE=database
  QUEUE_CONNECTION=database
  SESSION_DRIVER=database
  SESSION_LIFETIME=120

  # TIDAK pakai Redis — shared hosting tidak menyediakan

──────────────────────────────────────────────────────────────
2. PACKAGE COMPOSER
──────────────────────────────────────────────────────────────

  composer require inertiajs/inertia-laravel
  composer require tightenco/ziggy
  composer require spatie/laravel-permission
  composer require spatie/laravel-activitylog
  composer require spatie/laravel-data
  composer require spatie/laravel-backup
  composer require barryvdh/laravel-dompdf
  composer require picqer/php-barcode-generator
  composer require maatwebsite/excel
  composer require laravel/fortify

  composer require --dev laravel/pint
  composer require --dev pestphp/pest --with-all-dependencies
  composer require --dev pestphp/pest-plugin-laravel
  composer require --dev barryvdh/laravel-ide-helper

Publish yang diperlukan:
  php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
  php artisan vendor:publish --provider="Spatie\Activitylog\ActivitylogServiceProvider" --tag="activitylog-migrations"
  php artisan vendor:publish --provider="Spatie\Backup\BackupServiceProvider"
  php artisan vendor:publish --provider="Laravel\Fortify\FortifyServiceProvider"

Migration bawaan:
  php artisan session:table
  php artisan queue:table
  php artisan cache:table
  php artisan notifications:table
  php artisan migrate

──────────────────────────────────────────────────────────────
3. PACKAGE NPM
──────────────────────────────────────────────────────────────

  npm install @inertiajs/react react react-dom
  npm install -D @vitejs/plugin-react typescript @types/react @types/node
  npm install -D tailwindcss postcss autoprefixer
  npm install -D eslint prettier prettier-plugin-tailwindcss
  npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin

  npm install @tanstack/react-table
  npm install zustand
  npm install react-hotkeys-hook
  npm install react-hook-form @hookform/resolvers zod
  npm install date-fns
  npm install recharts
  npm install lucide-react
  npm install jsbarcode
  npm install clsx tailwind-merge class-variance-authority
  npm install sonner
  npm install ziggy-js

  npx tailwindcss init -p

──────────────────────────────────────────────────────────────
4. KONFIGURASI TYPESCRIPT
──────────────────────────────────────────────────────────────

tsconfig.json:
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "allowJs": true,
    "isolatedModules": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["resources/js/*"],
      "ziggy-js": ["vendor/tightenco/ziggy"]
    },
    "types": ["vite/client"]
  },
  "include": ["resources/js/**/*.ts", "resources/js/**/*.tsx",
              "resources/js/**/*.d.ts"]
}

──────────────────────────────────────────────────────────────
5. KONFIGURASI VITE
──────────────────────────────────────────────────────────────

vite.config.ts:
- laravel-vite-plugin dengan input resources/js/app.tsx dan
  resources/css/app.css
- @vitejs/plugin-react
- alias '@' → resources/js
- alias 'ziggy-js' → vendor/tightenco/ziggy
- server.host untuk Laragon (opsional)

──────────────────────────────────────────────────────────────
6. KONFIGURASI TAILWIND
──────────────────────────────────────────────────────────────

tailwind.config.js:
- darkMode: 'class'
- content: [
    './resources/**/*.blade.php',
    './resources/**/*.{js,ts,jsx,tsx}',
    './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
  ]
- theme.extend.colors:
  navy: {
    50:'#F0F4FA', 100:'#DCE5F2', 200:'#B9CBE5', 300:'#8AA6D1',
    400:'#5478B0', 500:'#2E5490', 600:'#1B3A6B', 700:'#152E56',
    800:'#1B2A4A', 900:'#0F1B33',
  },
  gold: '#C9A227',
  teal: '#0F8B8D',
  success: '#1E7A4C',
  warning: '#C77700',
  danger: '#B3261E',

- Token semantik (dipakai lewat CSS variable — detail di Fase UI-01):
  surface: 'rgb(var(--surface) / <alpha-value>)',
  bg: 'rgb(var(--bg) / <alpha-value>)',
  border: 'rgb(var(--border) / <alpha-value>)',
  content: 'rgb(var(--text) / <alpha-value>)',
  'content-muted': 'rgb(var(--text-muted) / <alpha-value>)',
  primary: 'rgb(var(--primary) / <alpha-value>)',

- fontFamily:
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],

Font di-load lewat @fontsource (npm) supaya tidak bergantung Google
Fonts CDN (penting untuk shared hosting yang kadang lambat):
  npm install @fontsource/inter @fontsource/jetbrains-mono

──────────────────────────────────────────────────────────────
7. SETUP INERTIA
──────────────────────────────────────────────────────────────

Backend:
  php artisan inertia:middleware

Daftarkan HandleInertiaRequests di bootstrap/app.php (Laravel 12
menggunakan bootstrap/app.php, bukan Kernel.php).

HandleInertiaRequests share:
- auth.user (dengan roles & permissions array)
- flash (success, error, warning, info)
- ziggy (route helper)
- appName
- (menu akan ditambahkan di Fase UI-01)

resources/views/app.blade.php — root template Inertia:
- @viteReactRefresh
- @vite(['resources/css/app.css', 'resources/js/app.tsx'])
- @inertiaHead
- @inertia
- Script inline untuk mode gelap sebelum paint (detail di Fase UI-01)

resources/js/app.tsx:
- createInertiaApp dengan resolvePageComponent
- Layout persisten (agar sidebar tidak re-mount tiap navigasi)
- Toaster dari sonner
- ZiggyVue equivalent untuk React (pakai ziggy-js route())

──────────────────────────────────────────────────────────────
8. SHADCN/UI
──────────────────────────────────────────────────────────────

  npx shadcn@latest init

Jawaban saat prompt:
- Style: New York
- Base color: Slate (nanti di-override token kita)
- CSS variables: YES
- Components path: @/Components/ui
- Utils path: @/Lib/utils

Install komponen (sesuai peta di pre-05):
  npx shadcn@latest add button input label card dialog sheet
  npx shadcn@latest add dropdown-menu popover tooltip badge separator
  npx shadcn@latest add form select checkbox radio-group switch textarea
  npx shadcn@latest add calendar command
  npx shadcn@latest add table tabs accordion avatar skeleton
  npx shadcn@latest add pagination scroll-area
  npx shadcn@latest add sonner alert alert-dialog progress
  npx shadcn@latest add breadcrumb navigation-menu
  npx shadcn@latest add resizable

CATATAN PENTING: setelah install, EDIT semua komponen shadcn agar pakai
token kita (bg-surface, text-content, border-border) — bukan warna
default shadcn (bg-background, text-foreground). Sesuaikan di
resources/css/app.css dengan memetakan variabel shadcn ke variabel kita.

──────────────────────────────────────────────────────────────
9. STRUKTUR FOLDER
──────────────────────────────────────────────────────────────

Buat folder kosong (dengan .gitkeep bila perlu):

app/
  Enums/
  Data/                      ← spatie/laravel-data DTO
  Http/Controllers/Admin/
  Http/Controllers/Pos/
  Http/Controllers/Public/
  Http/Controllers/Wali/
  Http/Middleware/
  Http/Requests/
  Models/
  Observers/
  Policies/
  Services/
  Support/
  Traits/
  Reports/                   ← untuk Fase 14

resources/js/
  Pages/Auth/
  Pages/Public/
  Pages/Wali/
  Pages/Admin/
  Pages/Pos/
  Layouts/
  Components/ui/             ← shadcn (sudah dibuat)
  Components/common/
  Components/forms/
  Components/charts/
  Hooks/
  Lib/schemas/
  Store/
  Types/

resources/views/
  app.blade.php
  pdf/
  mail/

routes/
  web.php
  admin.php
  pos.php

──────────────────────────────────────────────────────────────
10. HELPER BACKEND
──────────────────────────────────────────────────────────────

app/Support/Money.php
  public static function format(int $amount): string
      → "Rp 12.500" (pemisah titik, tanpa desimal)
  public static function formatShort(int $amount): string
      → "Rp 12,5rb" / "Rp 1,2jt" untuk dashboard
  public static function parse(string $input): int
      → "Rp 12.500" atau "12500" atau "12.500" → 12500
  public static function round(int $amount, int $step = 100): int
      → pembulatan ke kelipatan terdekat (default Rp 100)
  public static function roundUp(int $amount, int $step = 100): int
  public static function roundDown(int $amount, int $step = 100): int
  public static function terbilang(int $amount): string
      → "dua belas ribu lima ratus rupiah" (untuk kwitansi)

app/Support/ReferenceGenerator.php
  public static function generate(string $prefix, int $outletId): string
      → "INV-20260730-0001"
      Sekuensial per outlet per hari, AMAN dari race condition.

      Implementasi: tabel `reference_counters`
        (prefix, outlet_id, date, last_number) dengan unique index
        pada (prefix, outlet_id, date).
      Pakai DB::transaction + lockForUpdate, atau
      updateOrInsert + increment atomik.

  Buat migration untuk tabel reference_counters di fase ini.

app/Support/Str.php (helper tambahan)
  public static function slugUnique(string $text, string $table,
      string $column = 'slug', ?int $ignoreId = null): string
      → untuk slug produk di Fase 2

──────────────────────────────────────────────────────────────
11. HELPER FRONTEND (TypeScript)
──────────────────────────────────────────────────────────────

resources/js/Lib/utils.ts
  export function cn(...inputs: ClassValue[]): string
      → clsx + tailwind-merge (standar shadcn)

resources/js/Lib/money.ts
  export function formatMoney(amount: number): string
  export function formatMoneyShort(amount: number): string
  export function parseMoney(input: string): number
  export function roundMoney(amount: number, step = 100): number

  Hasil HARUS identik dengan Money.php di backend. Buat test untuk
  memverifikasi konsistensi (misal: 12500 → "Rp 12.500" di keduanya).

resources/js/Lib/date.ts
  export function formatDate(d: string | Date): string  → "30 Jul 2026"
  export function formatDateTime(d: string | Date): string
  export function formatTime(d: string | Date): string
  Semua pakai date-fns dengan locale id.

──────────────────────────────────────────────────────────────
12. KOMPONEN CUSTOM (COMMON)
──────────────────────────────────────────────────────────────

Buat di resources/js/Components/common/:

<Money amount={12500} />
  → <span className="font-mono tabular-nums">Rp 12.500</span>
  Props: amount, className, showSign (untuk +/-), size

<MoneyInput value onChange />
  → Input dengan format otomatis saat blur, parse saat focus.
  Terintegrasi dengan react-hook-form via forwardRef.

<PageHeader title subtitle breadcrumbs actions />
  → Header halaman admin: judul + breadcrumb + tombol aksi kanan

<StatCard label value icon trend trendLabel />
  → Kartu statistik dashboard. trend: number (persen, +/-)

<EmptyState icon title description action />
  → Placeholder saat data kosong

<DataTable columns data pagination sorting filtering />
  → Wrapper TanStack Table + shadcn Table.
  Fitur: sort, filter kolom, pagination server-side, row selection,
  bulk action bar, column visibility toggle, sticky header.
  Ini komponen PALING DIPAKAI — buat sematang mungkin.

<BulkActionBar selectedCount actions onClear />
  → Bar melayang saat ada baris terpilih

<DateRangePicker value onChange presets />
  → Calendar + Popover dengan preset:
    Hari Ini · Kemarin · 7 Hari · Minggu Ini · Bulan Ini ·
    Bulan Lalu · Kustom

<PinInput length={6} value onChange onComplete />
  → Input PIN dengan kotak terpisah per digit, auto-advance,
  paste support, masking

<ConfirmDialog title description onConfirm variant />
  → Wrapper AlertDialog untuk konfirmasi aksi destruktif

<LoadingOverlay show message />
  → Overlay saat proses berjalan (submit form, dsb)

──────────────────────────────────────────────────────────────
13. LAYOUT (5 buah)
──────────────────────────────────────────────────────────────

resources/js/Layouts/

GuestLayout.tsx
  → Untuk halaman auth. Center card, logo Skillage Mart di atas,
    background navy gradien halus, footer nama sekolah.

AdminLayout.tsx
  → Sidebar + header + main. Di FASE 0 cukup SKELETON:
    - Sidebar 260px navy-800, bisa dilipat
    - Header navy-600 dengan judul + profil dropdown
    - Main area bg token
    - Responsif: sidebar jadi Sheet drawer di < 1024px
  Menu lengkap & permission filtering dikerjakan di Fase UI-01.

PosLayout.tsx
  → Fullscreen tanpa sidebar. Header tipis: nama outlet, kasir,
    sesi aktif, indikator koneksi, tombol tutup sesi.
    Body 100vh tanpa scroll (kasir tidak boleh scroll halaman).

PublicLayout.tsx
  → Untuk storefront. Mobile-first. Header: logo + nav
    (Beranda, Produk, Promo, Cek Saldo, Tentang) + tombol
    "Portal Wali". Footer: alamat sekolah, kontak, jam buka,
    tautan sosial. Max-width container 1200px.

WaliLayout.tsx
  → Mobile-first. Header: nama wali + tombol logout.
    Bottom navigation (4 item): Beranda · Anak · Top-Up · Akun.
    Cocok untuk HP karena mayoritas wali akses via HP.

──────────────────────────────────────────────────────────────
14. ZUSTAND STORE (skeleton)
──────────────────────────────────────────────────────────────

resources/js/Store/

useThemeStore.ts
  → theme: 'light' | 'dark' | 'system'
    setTheme(), toggleTheme()
    Persist ke localStorage. Detail implementasi di Fase UI-01.

useSidebarStore.ts
  → collapsed: boolean, openGroups: string[]
    toggle(), setCollapsed(), toggleGroup()
    Persist ke localStorage.

useCartStore.ts  (SKELETON saja — diisi di Fase 8)
  → items: CartItem[], memberId, idempotencyKey
    addItem(), updateQty(), removeItem(), clearCart()
    Di Fase 0 cukup interface + store kosong.

──────────────────────────────────────────────────────────────
15. TRAIT & BASE CLASS BACKEND
──────────────────────────────────────────────────────────────

app/Traits/HasReference.php
  → Boot trait: saat creating, generate reference otomatis
    memakai ReferenceGenerator dengan prefix dari property
    $referencePrefix di model.

app/Traits/BelongsToOutlet.php
  → Global scope filter berdasarkan outlet aktif di session.
    Bypass bila user punya akses semua outlet (outlet_id null).

app/Traits/LogsActivityCustom.php
  → Wrapper spatie/activitylog dengan konfigurasi standar kita:
    log IP, user agent, before/after values.

──────────────────────────────────────────────────────────────
16. KONFIGURASI APLIKASI
──────────────────────────────────────────────────────────────

config/pos.php:
  return [
    'rounding_step' => 100,
    'rounding_mode' => 'nearest',  // nearest|up|down
    'tax_percent' => 0,             // PPN, default 0 untuk pesantren
    'receipt_width' => 58,          // 58 atau 80 mm
    'low_stock_threshold_percent' => 20,
    'opname_tolerance_percent' => 0.5,
    'session_auto_close_time' => '23:59',
    'max_hold_per_cashier' => 5,
    'deposit_min_topup' => 10000,
    'pin_length' => 6,
    'pin_max_attempts' => 3,
    'pin_lockout_minutes' => 15,
    'no_pin_threshold' => 20000,    // bebas PIN di bawah nominal ini
    'return_max_days' => 7,
    'max_discount_percent' => 50,
    'birthday_bonus_amount' => 10000,
    'point_ratio' => 10000,          // Rp 10.000 = 1 poin
    'point_value' => 100,            // 1 poin = Rp 100
    'point_expiry_months' => 12,
  ];

config/storefront.php:
  return [
    'products_per_page' => 24,
    'show_stock_badge' => true,      // Tersedia/Habis, BUKAN angka
    'show_price' => true,
    'featured_limit' => 8,
    'cache_ttl_minutes' => 15,
    'contact' => [
      'address' => 'Jonggol, Kabupaten Bogor, Jawa Barat',
      'phone' => '',
      'email' => '',
      'hours' => 'Senin–Sabtu 07.00–17.00',
    ],
  ];

config/navigation.php:
  → Struktur menu admin. Di Fase 0 cukup skeleton kosong dengan
    komentar. Diisi lengkap di Fase UI-01.

──────────────────────────────────────────────────────────────
17. HALAMAN UJI (SEMENTARA)
──────────────────────────────────────────────────────────────

Buat halaman uji untuk memverifikasi semua fondasi bekerja:

routes/web.php:
  Route::get('/', fn() => Inertia::render('Public/Welcome'));
  Route::get('/uji-komponen', fn() => Inertia::render('UjiKomponen'));

resources/js/Pages/Public/Welcome.tsx
  → Landing sederhana: logo, "Skillage Mart", tagline, tombol
    "Lihat Produk" (dummy) & "Portal Wali" (dummy).
    Pakai PublicLayout.

resources/js/Pages/UjiKomponen.tsx
  → Halaman demo SEMUA komponen yang dibuat di fase ini:
    - Semua varian Button
    - Input, MoneyInput, Select, Checkbox, Switch, Textarea
    - Card, Badge (semua warna)
    - Dialog, Sheet, AlertDialog
    - Tabs, Accordion
    - DataTable dengan 20 baris dummy
    - StatCard × 4
    - EmptyState
    - DateRangePicker
    - PinInput
    - Money dalam berbagai nominal
    - Toggle mode gelap
    Pakai AdminLayout.

  Halaman ini SANGAT berguna untuk verifikasi visual dan akan
  dipakai terus selama pengembangan. JANGAN dihapus.

──────────────────────────────────────────────────────────────
18. TOOLING
──────────────────────────────────────────────────────────────

.prettierrc:
  {
    "semi": false,
    "singleQuote": true,
    "tabWidth": 2,
    "printWidth": 100,
    "plugins": ["prettier-plugin-tailwindcss"]
  }

eslint.config.js (flat config untuk ESLint 9):
  - typescript-eslint recommended
  - react-hooks rules
  - no-explicit-any: warn (bukan error, tapi harus disadari)

pint.json (Laravel Pint):
  { "preset": "laravel" }

package.json scripts:
  "dev": "vite"
  "build": "vite build"
  "lint": "eslint resources/js --ext .ts,.tsx"
  "format": "prettier --write resources/js"
  "type-check": "tsc --noEmit"

composer.json scripts:
  "pint": "pint"
  "test": "pest"

──────────────────────────────────────────────────────────────
19. GIT
──────────────────────────────────────────────────────────────

Pastikan .gitignore mencakup:
  /node_modules
  /public/build
  /public/hot
  /public/storage
  /storage/*.key
  /storage/backups
  /vendor
  .env
  .env.backup
  .phpunit.result.cache
  9router-config.json
  _references/

──────────────────────────────────────────────────────────────
CHECKLIST VERIFIKASI
──────────────────────────────────────────────────────────────

Jalankan dan pastikan semua lolos:

BACKEND
□ php artisan --version → Laravel 12.x
□ php artisan migrate:fresh → sukses tanpa error
□ php artisan tinker
    >>> App\Support\Money::format(12500)
    = "Rp 12.500"
    >>> App\Support\Money::parse('Rp 1.250.000')
    = 1250000
    >>> App\Support\Money::round(12530)
    = 12500
    >>> App\Support\ReferenceGenerator::generate('INV', 1)
    = "INV-20260730-0001"
    >>> App\Support\ReferenceGenerator::generate('INV', 1)
    = "INV-20260730-0002"   (increment benar)
□ php artisan route:list → route / dan /uji-komponen terdaftar
□ Tabel reference_counters ada di database
□ ./vendor/bin/pint --test → tidak ada pelanggaran

FRONTEND
□ npm run dev → Vite jalan tanpa error
□ npm run type-check → 0 error TypeScript
□ npm run lint → 0 error (warning boleh)
□ npm run build → build sukses, output di public/build

VISUAL (buka browser)
□ http://skillage-mart.test → landing page tampil dengan PublicLayout
□ http://skillage-mart.test/uji-komponen → semua komponen render
□ Di /uji-komponen: klik toggle mode gelap → warna berubah
□ Di /uji-komponen: DataTable bisa sort, filter, pilih baris
□ Di /uji-komponen: Dialog & Sheet buka-tutup
□ Di /uji-komponen: PinInput auto-advance saat ketik
□ Di /uji-komponen: <Money amount={12500} /> tampil "Rp 12.500"
    dengan font mono
□ Resize browser < 1024px → AdminLayout sidebar jadi drawer
□ Tidak ada error di console browser

KONSISTENSI
□ formatMoney(12500) di TS = Money::format(12500) di PHP
□ Semua komponen shadcn sudah pakai token kita (cek: tidak ada
  className dengan bg-white atau dark:bg-slate-900 di komponen ui/)
□ Font Inter dan JetBrains Mono ter-load (cek di DevTools > Network)

STRUKTUR
□ Semua folder di § 9 sudah ada
□ 5 layout file sudah ada di resources/js/Layouts/
□ Minimal 11 komponen custom sudah ada di Components/common/
□ 3 Zustand store sudah ada (skeleton boleh)
□ config/pos.php, config/storefront.php, config/navigation.php ada

Setelah semua lolos → commit:
  git add .
  git commit -m "Fase 0: fondasi Laravel 12 + Inertia + React + TS + shadcn"
  git push
```

---

## CATATAN UNTUK ZIYAD

**Yang paling sering bermasalah di fase ini:**

1. **Shadcn + token custom.** Setelah `npx shadcn add`, komponen pakai
   variabel default shadcn (`--background`, `--foreground`). Petakan ke
   variabel kita di `app.css`, jangan edit satu-per-satu komponennya.

2. **Ziggy + TypeScript.** `route()` helper butuh generate types:
   `php artisan ziggy:generate --types`. Jalankan ulang setiap kali
   menambah route baru.

3. **Laragon virtual host.** Kalau `skillage-mart.test` tidak jalan,
   klik kanan Laragon → Apache → Reload. Atau pakai
   `php artisan serve` di `localhost:8000` — sama saja untuk dev.

4. **Vite HMR di Laragon.** Kalau HMR tidak jalan, tambahkan di
   `vite.config.ts`:
   ```ts
   server: { hmr: { host: 'localhost' } }
   ```

5. **DataTable adalah investasi terbesar di fase ini.** Buat sematang
   mungkin sekarang — akan dipakai di 30+ halaman. Kalau setengah jadi,
   Pak akan menyesal di Fase 5.

---

*Fase 0 V2 — Skillage Mart POS*
