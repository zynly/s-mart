# T-002 — Konfigurasi Tailwind v4 + Token Navy + shadcn/ui (Radix)

**Fase induk:** Fase 0 (Fondasi Proyek)
**Status:** ✅ Selesai (2026-07-30)
**Estimasi:** M (≤4 jam) — realisasi ~2 jam

## Deskripsi

Konfigurasi identitas visual (skala navy, gold, teal, semantik) sebagai
token CSS, dark mode class-based, dan instalasi 32 komponen shadcn/ui
berbasis Radix dengan alias path PascalCase (`@/Components`, `@/Lib`)
sesuai konvensi folder proyek.

## Kriteria Penerimaan

- [x] `resources/css/app.css` berisi `@theme` dengan palet `navy-50..900`,
      `gold`, `teal`, `success`, `warning`, `danger`, font Inter/JetBrains Mono
- [x] Token semantik `bg-surface`, `bg-bg`, `text-content`,
      `text-content-muted`, `border-border`, `bg-primary` berfungsi di
      light & dark mode (via `@custom-variant dark`)
- [x] Token shadcn (`background`, `card`, `primary`, `secondary`, `muted`,
      `accent`, `destructive`, `border`, `input`, `ring`) dipetakan ke
      variabel yang sama dengan token kustom — bukan didefinisikan ulang
- [x] `npx shadcn@latest init -b radix` sukses, `components.json` pakai
      alias `@/Components/ui`, `@/Lib/utils` (PascalCase)
- [x] 32 komponen shadcn terpasang di `resources/js/Components/ui/`
- [x] Tidak ada komponen `ui/` yang pakai `bg-white`/`dark:bg-slate-900`
      hardcoded

## Blocking Edges

- T-001 harus sudah selesai.

## Referensi

- ADR-0001 § Konsekuensi (Tailwind v4, shadcn Radix)
- `fase-00-v2.md` § 6, 8
- `README-v2.md` § Identitas Visual

## Catatan Implementasi

- Laravel 12 fresh install (per 2026) sudah default pakai **Tailwind v4**
  + `@tailwindcss/vite`, bukan v3 seperti asumsi dokumen awal — konfigurasi
  token lewat `@theme`/`@theme inline` di CSS, bukan `tailwind.config.js`.
- shadcn CLI versi baru (4.x) memakai sistem **preset** (Nova, Vega, dst)
  yang secara default membawa font Geist dan basis **Base UI** — WAJIB
  pakai flag `-b radix` eksplisit untuk mendapat basis Radix yang
  dibutuhkan translasi Fase 1–18 (`<Tabs>` dari shadcn/ui disebut eksplisit
  "Radix" di `fase-ui-01-v2.md`).
- Folder yang digenerate CLI default lowercase (`components/`, `lib/`) —
  perlu rename manual dua-langkah di Windows (case-insensitive
  filesystem) ke `Components/`/`Lib/` sesuai konvensi folder proyek, lalu
  update `components.json` aliases.
- Import `@import "shadcn/tailwind.css"` **wajib dipertahankan** — berisi
  keyframe accordion dan custom variant (`data-checked`, `data-selected`,
  dst) yang dipakai banyak komponen shadcn (Accordion, Switch, Command).
  Jangan dihapus saat membersihkan preset Nova.
