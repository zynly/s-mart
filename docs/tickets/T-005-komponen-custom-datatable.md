# T-005 — 11 Komponen Custom (Money, DataTable, dst) + Halaman Uji

**Fase induk:** Fase 0 (Fondasi Proyek)
**Status:** ✅ Selesai (2026-07-30)
**Estimasi:** L (≤8 jam) — realisasi ~4 jam

## Deskripsi

Membangun 11 komponen custom di `Components/common/` di atas basis
shadcn/ui, dengan `DataTable` sebagai investasi terbesar (dipakai 30+
halaman di fase berikutnya), plus halaman `/uji-komponen` untuk
verifikasi visual berkelanjutan.

## Kriteria Penerimaan

- [x] `Money`, `MoneyInput`, `PageHeader`, `StatCard`, `EmptyState`,
      `DataTable`, `BulkActionBar`, `DateRangePicker`, `PinInput`,
      `ConfirmDialog`, `LoadingOverlay` — semua ada di
      `resources/js/Components/common/`
- [x] `DataTable`: sort, filter kolom, pagination server-side, row
      selection, bulk action bar, column visibility toggle, sticky header
- [x] `PinInput`: auto-advance antar kotak, paste support, masking
- [x] Halaman `/uji-komponen` menampilkan seluruh komponen di atas + semua
      varian Button/Badge, dengan 20 baris data dummy di DataTable
- [x] Toggle mode gelap di halaman uji berhasil membalik seluruh warna
      (diverifikasi via screenshot Playwright, tanpa console error)
- [x] `npm run type-check` — 0 error
- [x] `npm run lint` — 0 error (warning boleh)
- [x] `npm run build` — sukses

## Blocking Edges

- T-002 dan T-003 harus sudah selesai.

## Referensi

- `fase-00-v2.md` § 12, 17, "CATATAN UNTUK ZIYAD" poin 5
- CONTEXT.md § Istilah Teknis (Token warna)

## Catatan Implementasi

- `createInertiaApp`'s tipe `ComponentResolver` dari `@inertiajs/react`
  hanya mengizinkan `ReactComponent | Promise<ReactComponent> |
  {default: ReactComponent}` — **tidak** mengizinkan
  `Promise<{default: ReactComponent}>` yang dihasilkan
  `resolvePageComponent()` + `import.meta.glob()` langsung. Perlu unwrap
  manual `.then((module: any) => module.default)` di `app.tsx` (boundary
  `any` terdokumentasi, sesuai aturan kode #13).
- React 19 (bukan React 18 seperti asumsi awal dokumen) sudah mendukung
  `ref` sebagai prop biasa tanpa `forwardRef` — komponen shadcn generasi
  baru (`Input`, dst) memang tidak lagi memakai `forwardRef`, tapi
  `MoneyInput` custom tetap aman memakainya untuk kompatibilitas.
- Verifikasi visual browser dilakukan via Playwright + Chromium headless
  (di-install ad-hoc di scratchpad, bukan dependency proyek) karena
  `chromium-cli` tidak tersedia di environment ini.
