# ADR-0001: Inertia + React, menggantikan rencana asli Livewire

**Status:** Diterima
**Tanggal:** 2026-07-30
**Konteks:** Rencana awal (`PROMPT-POS-SKILLAGE-MART.md`, Fase 0–18) memakai
Laravel 11 + Livewire 3 + Blade + Alpine.js, dan sudah diimplementasikan
sebagian di proyek `skillage-mart` (progres sampai modul Consignment &
Deposit). Untuk proyek `s-mart` ini, versi 2 (`README-v2.md`) memutuskan
pivot presentasi.

## Keputusan

Menggunakan **Laravel 12 + Inertia.js v2 + React 18/19 + TypeScript (strict
mode)** sebagai lapisan view, tetap dalam monolith Laravel. Seluruh aturan
bisnis, migration, model, enum, service, form request, dan route dari
rencana asli Fase 1–18 **tetap dipakai apa adanya** — hanya lapisan
presentasi yang berubah (lihat tabel translasi di `README-v2.md` §
"ATURAN TRANSLASI").

## Alternatif yang Dipertimbangkan

1. **Tetap Livewire** (seperti `skillage-mart`) — matang, sudah ada
   progres nyata, tapi HMR lebih lambat dan tanpa type safety end-to-end.
2. **Laravel API + React SPA terpisah** (Vite mandiri, TanStack Query) —
   overkill: butuh REST resource, auth token, CORS, dokumentasi OpenAPI
   terpisah untuk aplikasi solo-maintainer.
3. **Blade + Alpine murni** — cukup untuk storefront, tidak cukup untuk
   layar kasir yang butuh interaksi kompleks (hotkey, cart state, scan
   barcode responsif).

## Konsekuensi

- Controller memanggil Service langsung, kirim props ke Inertia — tanpa
  API layer terpisah.
- TypeScript strict mode wajib; sinkronisasi tipe backend↔frontend lewat
  `spatie/laravel-data` DTO dan Ziggy route helper (`ziggy:generate --types`).
- Tailwind v4 dipakai (bukan v3 seperti asumsi awal dokumen) — konfigurasi
  token warna lewat `@theme`/`@theme inline` di CSS, bukan `tailwind.config.js`
  JS-based. Dark mode via `@custom-variant dark (&:where(.dark, .dark *))`,
  sama secara fungsional dengan pendekatan CSS-variable yang dipakai
  `skillage-mart` (lihat `resources/css/app.css`).
- shadcn/ui dipakai dengan basis **Radix** (bukan Base UI) untuk komponen
  interaktif kompleks (Dialog, Popover, Command, dll).
- Bundle JS lebih besar dari Livewire, tapi masih wajar untuk target
  deploy shared hosting (lihat ADR-0008).
- Proyek `skillage-mart` (Livewire) tetap ada sebagai referensi paralel,
  tidak dihapus — `s-mart` adalah rebuild terpisah.

## Tanggal Peninjauan Ulang

Setelah Fase 8 (Layar Kasir) selesai. Bila performa React di shared
hosting tidak memenuhi target (scan-to-render < 800ms p95 untuk 30
concurrent user, lihat ADR-0008), evaluasi kembali.
