# PROMPT SKILLAGE MART POS — VERSI 2 (INERTIA + REACT + TS)

Versi ini menggantikan `README.md` versi lama sepenuhnya. Stack, aturan
kode, dan struktur folder disesuaikan untuk **Laravel 12 + Inertia + React 18
+ TypeScript** dengan target deploy **shared hosting Hostinger**.

**Fase 1–18 asli tetap dipakai** dengan aturan translasi di § 5 dokumen ini.

---

## KONTEKS GLOBAL (SALIN KE AWAL SETIAP SESI)

```
Saya sedang membangun aplikasi Point of Sale bernama "Skillage Mart" untuk
minimarket SMK Skill Village Islamic School — SMK berbasis pesantren di
Jonggol, Bogor. Aplikasi ini punya TIGA area:

1. AREA PUBLIK (storefront katalog) — /
   Pengunjung umum bisa lihat produk & harga, tidak ada belanja online.
2. PORTAL WALI — /wali (login HP + password)
   Wali santri lihat saldo & riwayat anak, ajukan top-up manual (upload
   bukti transfer).
3. PANEL ADMIN & KASIR — /admin dan /pos (login staff)
   Semua operasi minimarket: kasir, master data, stok, akuntansi, laporan.

Pembeli utama adalah santri yang bayar pakai SALDO DEPOSIT via kartu barcode.
Wali bisa top-up saldo dari rumah lewat portal wali.

=== STACK WAJIB ===
Backend:
- Laravel 12 (PHP 8.3)
- MySQL 8 (shared hosting) — bukan PostgreSQL
- Inertia.js v2 sebagai bridge Laravel ↔ React
- spatie/laravel-permission (role & izin)
- spatie/laravel-activitylog (audit trail)
- spatie/laravel-data (DTO + type sharing ke TypeScript)
- barryvdh/laravel-dompdf (struk & laporan PDF)
- picqer/php-barcode-generator (barcode Code128)
- maatwebsite/excel (impor/ekspor)
- laravel/fortify (auth + fondasi 2FA, disiapkan tapi 2FA opsional)
- laravel/tinker

Frontend:
- React 18 + TypeScript (strict mode)
- Vite 5
- Tailwind CSS 3
- shadcn/ui (komponen dasar — copy ke resources/js/components/ui)
- @tanstack/react-table v8 (tabel data)
- Zustand (state global: cart kasir, tema, sidebar)
- react-hotkeys-hook (hotkey F1–F12 di kasir)
- react-hook-form + zod (form + validasi)
- date-fns (utility tanggal)
- recharts (chart dashboard)
- lucide-react (ikon)
- jsbarcode (render barcode di client)

Development:
- Laragon di C:\laragon\www\skillage-mart
- VSCode + extension: Intelephense, ESLint, Prettier, Tailwind IntelliSense
- Git + GitHub private

Deployment (target):
- Shared hosting Hostinger (Premium/Business)
- MySQL 8 shared
- Queue lewat cron (bukan Supervisor)
- Backup harian via cron ke Backblaze B2

JANGAN gunakan:
- Filament, Nova, Backpack, atau admin panel package lainnya
- Livewire (kita pakai Inertia + React)
- Blade sebagai layout utama (Blade hanya untuk: root template, struk PDF, email)
- Redis (tidak tersedia di shared hosting) — pakai database/file cache
- Websocket, Reverb (tidak feasible di shared hosting)

=== IDENTITAS VISUAL ===
Primary: navy #1B3A6B
Skala navy:
  50 #F0F4FA · 100 #DCE5F2 · 200 #B9CBE5 · 300 #8AA6D1 · 400 #5478B0
  500 #2E5490 · 600 #1B3A6B · 700 #152E56 · 800 #1B2A4A · 900 #0F1B33
Pendukung: gold #C9A227 · teal #0F8B8D
Semantik: success #1E7A4C · warning #C77700 · danger #B3261E
Font: Inter (UI), JetBrains Mono (nominal & angka)

Semua warna dipakai lewat token CSS variable (bg-surface, text-content,
border-border) — bukan warna langsung. Dark mode via .dark class di <html>.
Lihat fase-ui-01-v2.md.

=== ATURAN KODE (WAJIB DIPATUHI SEMUA FASE) ===

BACKEND:
1. Semua nominal uang = BIGINT rupiah penuh (bukan desimal, bukan sen).
   Contoh: Rp 12.500 → 12500.
2. Semua transaksi keuangan/stok dibungkus DB::transaction() dengan
   lockForUpdate() pada baris yang di-mutasi.
3. Tidak ada hard delete pada tabel transaksi. Pakai SoftDeletes atau
   kolom status 'cancelled/void'.
4. Setiap transaksi mencatat: user_id, outlet_id, created_at.
   Transaksi kasir juga cashier_session_id.
5. Logika bisnis di Service class. Controller & komponen React hanya
   orkestrasi — tidak boleh berisi aturan bisnis.
6. Validasi input pakai FormRequest. Untuk data yang di-share ke React,
   pakai spatie/laravel-data DTO agar TypeScript typing otomatis konsisten.
7. Enum PHP 8.1 untuk semua status dan tipe.
8. Nama tabel & kolom: bahasa Inggris, snake_case.
   Label UI: bahasa Indonesia.
9. Setiap tabel transaksi punya kolom `reference` unik format
   PREFIX-YYYYMMDD-NNNN, sekuensial per outlet per hari.
10. Setiap operasi tulis kritis menerima idempotency_key (UUID) untuk
    mencegah double-submit.
11. Model tidak boleh berisi query kompleks. Query di Repository atau
    Query Builder Service.
12. Observer/Event Listener untuk journaling otomatis (Fase 13).

FRONTEND (React + TypeScript):
13. TypeScript strict mode ON. Tidak boleh `any` kecuali di boundary
    (event handler, dsb) dengan komentar alasan.
14. Setiap page component ada di resources/js/Pages/, ekspor default.
15. Komponen UI pakai shadcn/ui sebagai basis. Custom hanya untuk yang
    belum ada di peta komponen.
16. State global pakai Zustand — HANYA untuk cart kasir, tema, sidebar.
    Data page pakai Inertia props, bukan Zustand.
17. Form pakai react-hook-form + zod schema. Schema didefinisikan di
    resources/js/Lib/schemas/.
18. Nominal uang di client tetap sebagai number (JS number aman sampai
    9 quadrillion — cukup untuk Rp). Format tampilan pakai <Money />.
19. Jangan pakai fetch/axios untuk operasi utama — pakai Inertia router.
    TanStack Query hanya untuk polling ringan (notifikasi, status).
20. Semua warna via token: bg-surface, text-content, border-border, dst.
    Dilarang: bg-white, dark:bg-slate-900, warna hex langsung di JSX.

KEAMANAN (khusus konteks online):
21. Rate limit login: 5x/menit per IP. PIN member: 3x → kunci 15 menit.
22. HTTPS mandatory di production. Redirect 301 dari HTTP.
23. Session timeout: kasir 30 menit idle, admin 2 jam, owner 8 jam.
24. Semua form pakai CSRF (Inertia otomatis handle).
25. CSP header ketat lewat middleware.
26. 2FA opsional untuk owner/admin/treasurer (Fortify, bisa diaktifkan
    per user di Fase 17).
27. Audit log wajib: IP, user agent, geolocation kasar, action, before/after.

=== FORMAT JAWABAN YANG SAYA HARAPKAN ===
- Kode LENGKAP dan siap jalan, bukan potongan.
- Backend: migration, model, enum, service, form request, DTO,
  controller (Inertia), route, policy, seeder bila relevan.
- Frontend: page component .tsx, komponen custom .tsx, schema zod,
  hook custom kalau perlu, tipe TypeScript.
- Perintah composer/npm/artisan yang perlu dijalankan.
- Di akhir: checklist verifikasi manual untuk saya uji.
```

---

## STRUKTUR FOLDER

```
skillage-mart/
├── app/
│   ├── Enums/
│   ├── Data/                   # spatie/laravel-data DTO
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Admin/
│   │   │   ├── Pos/
│   │   │   ├── Public/
│   │   │   └── Wali/
│   │   ├── Middleware/
│   │   └── Requests/
│   ├── Livewire/               # KOSONG — kita tidak pakai Livewire
│   ├── Models/
│   ├── Observers/              # untuk journaling otomatis
│   ├── Policies/
│   ├── Services/
│   ├── Support/                # Money.php, ReferenceGenerator.php
│   └── Traits/
├── resources/
│   ├── css/
│   │   └── app.css             # Tailwind + CSS variables
│   ├── js/
│   │   ├── Pages/              # Inertia pages
│   │   │   ├── Auth/
│   │   │   ├── Public/         # Storefront
│   │   │   ├── Wali/
│   │   │   ├── Admin/
│   │   │   └── Pos/
│   │   ├── Layouts/
│   │   │   ├── PublicLayout.tsx
│   │   │   ├── WaliLayout.tsx
│   │   │   ├── GuestLayout.tsx
│   │   │   ├── AdminLayout.tsx
│   │   │   └── PosLayout.tsx
│   │   ├── Components/
│   │   │   ├── ui/             # shadcn/ui (copy-pasted)
│   │   │   ├── common/         # Money, StatCard, PageHeader, etc.
│   │   │   ├── forms/          # form fields khusus
│   │   │   └── charts/         # wrapper recharts
│   │   ├── Hooks/              # useCart, useTheme, useSupervisorPin
│   │   ├── Lib/
│   │   │   ├── utils.ts        # cn(), formatMoney, dst
│   │   │   ├── schemas/        # zod schemas
│   │   │   └── api.ts
│   │   ├── Store/              # Zustand stores
│   │   ├── Types/              # index.d.ts (dari spatie/data)
│   │   └── app.tsx             # entry point
│   └── views/
│       ├── app.blade.php       # root Inertia
│       ├── pdf/                # struk & laporan PDF
│       └── mail/               # email templates
├── routes/
│   ├── web.php                 # public + wali + auth
│   ├── admin.php               # panel admin (/admin/*)
│   ├── pos.php                 # kasir (/pos)
│   └── console.php             # scheduler
├── database/
│   ├── migrations/
│   └── seeders/
├── config/
│   ├── navigation.php          # peta sidebar admin (Fase UI-01)
│   ├── pos.php                 # rounding, tax, threshold, dst
│   └── storefront.php          # settings storefront
├── docs/                       # dari pre-coding
├── public/
│   ├── build/                  # output Vite
│   └── uploads/                # gambar produk, dsb
├── storage/
│   └── backups/                # backup DB harian
├── tests/
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── composer.json
```

---

## ATURAN TRANSLASI: FASE 1–18 (LIVEWIRE → REACT)

Fase 1 sampai 18 asli (`fase-01.md` … `fase-18.md`) **tetap dipakai**.
Yang berubah hanya lapisan presentasi. Terapkan translasi berikut saat
membaca fase asli:

### Backend (tidak berubah)
- Migration, Model, Enum, Service, FormRequest, Observer, Seeder — **PERSIS
  seperti fase asli**.
- Route Laravel tetap.
- Semua aturan bisnis tetap.

### Presentasi (berubah pola)

| Fase Asli Menyebut | Ganti Jadi |
|---|---|
| Livewire component | Inertia controller + React page (.tsx) |
| Blade view | React page (.tsx) di resources/js/Pages/ |
| `<x-ui.button>` | `<Button>` dari shadcn/ui |
| `<x-ui.input>` | `<Input>` dari shadcn/ui |
| `<x-ui.card>` | `<Card>` dari shadcn/ui |
| `<x-ui.modal>` | `<Dialog>` dari shadcn/ui |
| `<x-ui.table>` | `<DataTable>` custom (wrapper TanStack + shadcn Table) |
| `<x-ui.badge>` | `<Badge>` dari shadcn/ui |
| `<x-ui.tabs>` | `<Tabs>` dari shadcn/ui (Radix) |
| `<x-ui.empty-state>` | `<EmptyState>` komponen custom |
| `<x-ui.money>` | `<Money amount={...} />` komponen custom |
| `<x-ui.page-header>` | `<PageHeader>` komponen custom |
| `<x-ui.stat-card>` | `<StatCard>` komponen custom |
| `wire:model` | `useForm` dari react-hook-form + zod |
| `wire:click` | `onClick` React |
| `wire:submit` | `handleSubmit(onSubmit)` dari react-hook-form |
| `Livewire property` | Inertia prop (dari controller) atau local `useState` |
| `Livewire lifecycle (mount, updated)` | `useEffect` React |
| `redirect()->route()` di Livewire | `router.visit()` dari @inertiajs/react |
| `session()->flash()` | Inertia flash prop (di `HandleInertiaRequests`) |

### Contoh pola konversi

**Fase asli menyebut:**
> Layar kasir: input barcode Livewire component dengan wire:model.blur.

**Diterjemahkan jadi:**

Controller:
```php
class KasirController {
    public function index(): Response {
        return Inertia::render('Pos/Kasir', [
            'session' => CashierSessionData::from($activeSession),
            'favorites' => ProductData::collection($favorites),
        ]);
    }
    public function scan(ScanBarcodeRequest $req, SaleService $svc) {
        $result = $svc->addItemByBarcode(...);
        return back()->with('scanResult', $result);
    }
}
```

Page (`resources/js/Pages/Pos/Kasir.tsx`):
```tsx
export default function Kasir({ session, favorites }: PageProps) {
  const cart = useCartStore()
  const barcodeRef = useRef<HTMLInputElement>(null)

  useEffect(() => barcodeRef.current?.focus(), [])
  useHotkeys('f9', () => setPaymentOpen(true))

  const handleScan = (barcode: string) => {
    router.post('/pos/scan', { barcode }, {
      onSuccess: () => barcodeRef.current?.focus(),
    })
  }
  // ...
}
```

---

## ATURAN TIDAK BOLEH DILANGGAR (KONSOLIDASI)

Diambil dari review saya + rencana asli, semua di satu tempat:

**Uang & Saldo**
1. Nominal uang = BIGINT rupiah, tanpa desimal.
2. Saldo deposit HANYA lewat `DepositService::record()` dengan
   `lockForUpdate()` + `idempotency_key`.
3. Deposit dicatat sebagai KEWAJIBAN akun (2-1200), bukan pendapatan.
4. Refund ikut metode bayar ASAL — tidak bisa jadi tunai.
5. Retur pembelian mengurangi HUTANG, bukan menambah kas (bila kredit).

**Stok**
6. Konsumsi stok HANYA lewat `StockService::consume()` dengan FEFO
   (expired_at ASC NULLS LAST, received_at ASC).
7. Retur MENGEMBALIKAN ke layer asal (via
   `stock_layer_consumption_id`), bukan bikin layer baru.
8. `system_qty` opname DIBEKUKAN saat status → counting.
9. **KONSINYASI = model murni** (barang bukan aset sekolah).
   Terima konsinyasi = TIDAK ADA jurnal. Jual = akui utang konsinyasi
   + pendapatan komisi.

**Transaksi**
10. Nomor nota tidak pernah dipakai ulang, termasuk yang di-void.
11. Void hanya boleh saat sesi masih terbuka. Setelah sesi tutup, wajib
    Retur (bukan Void), dan refund WAJIB non-tunai bila sesi kasir asal
    sudah tutup.
12. Harga di nota di-SNAPSHOT, tidak diambil dari master saat cetak ulang.
13. Sesi tertutup TIDAK bisa dibuka kembali — koreksi lewat jurnal.

**Diskon**
14. Harga akhir per item TIDAK PERNAH di bawah HPP (`unit_cost`).
15. Prioritas diskon 3 tahap seperti Fase 10, WAJIB.
16. `days_of_week` promo pakai konvensi ISO (1=Senin, 7=Minggu).

**Kredit Anggota**
17. **TIDAK ADA `allow_negative`.** Belanja di atas saldo = terbit
    Receivable (piutang) via Fase 9 metode "Kredit/Tempo". Field
    `allow_negative` dan `credit_limit` dibuang dari tabel `members`,
    diganti `receivable_limit` (batas total piutang aktif per anggota).

**Kupon**
18. Void nota → status kupon di tabel `coupons` KEMBALI ke 'active',
    dan `coupon_redemptions.is_reverted` = true.

**Akuntansi**
19. Setiap jurnal harus SEIMBANG (D = K). Bila tidak, lempar exception.
20. Setiap operasi tulis kritis menerima `idempotency_key`.

**Storefront**
21. Storefront TIDAK menampilkan angka stok — hanya badge
    "Tersedia" / "Habis".
22. Storefront TIDAK menampilkan HPP/margin.
23. Produk yang `is_visible_public = false` DILARANG muncul di
    storefront apapun caranya.

**Online-specific**
24. Session cookie: `SameSite=Lax`, `Secure` di production,
    `HttpOnly`, dengan CSRF Laravel bawaan.
25. Semua endpoint yang mengubah data anggota/saldo/pembayaran WAJIB
    idempotency_key.
26. Backup DB harian ke offsite (Backblaze B2), retention 30 hari.
27. Rate limit khusus untuk `/wali/*` login: 5x/menit per HP.

---

## LAMPIRAN — RINGKASAN ROLE

| Role | Kasir | Master | Stok | Beli | Kas | Jurnal | Laporan | Anggota | Setting |
|---|---|---|---|---|---|---|---|---|---|
| owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| admin | ✓ | ✓ | ✓ | ✓ | ✓ | lihat | ✓ | ✓ | ✓ |
| supervisor | ✓ | lihat | approve | lihat | lihat | — | penjualan | lihat | — |
| cashier | ✓ | — | lihat | — | sesi | — | sesi sendiri | lihat | — |
| warehouse | — | produk | ✓ | ✓ | — | — | stok | — | — |
| treasurer | — | — | lihat | lihat | ✓ | ✓ | keuangan | lihat | — |
| guardian | — | — | — | — | — | — | — | anaknya | — |

**Kewenangan eksklusif owner:** hapus piutang · penyesuaian saldo · tutup
buku · reset sistem · lihat HPP & margin · approve selisih opname besar

---

## LAMPIRAN — PREFIKS REFERENSI

| Prefiks | Transaksi | Prefiks | Transaksi |
|---|---|---|---|
| INV | Penjualan | DEP | Mutasi Deposit |
| RJ | Retur Penjualan | TOP | Top-Up |
| PO | Purchase Order | SES | Sesi Kasir |
| PB | Pembelian | KAS | Kas Masuk/Keluar |
| RB | Retur Pembelian | JU | Jurnal Umum |
| SO | Stock Opname | HTG | Pembayaran Hutang |
| TF | Transfer Stok | PTG | Pembayaran Piutang |
| ADJ | Penyesuaian Stok | KON | Settlement Konsinyasi |
| WO | Write-Off | HOLD | Transaksi Ditahan |
| REQ | Request Top-Up dari Wali | | |

Format: `PREFIX-YYYYMMDD-NNNN` — sekuensial per outlet per hari.

---

**Total: 19 fase (18 asli + 1 baru storefront) + fase UI-01 revisi.**

*SMK Skill Village Islamic School — Skillage Mart POS v2*
