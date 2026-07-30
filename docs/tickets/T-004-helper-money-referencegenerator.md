# T-004 — Helper Money (PHP+TS) & ReferenceGenerator

**Fase induk:** Fase 0 (Fondasi Proyek)
**Status:** ✅ Selesai (2026-07-30)
**Estimasi:** S (≤2 jam) — realisasi ~1.5 jam

## Deskripsi

Implementasi helper format/parse nominal uang yang identik hasilnya di
backend (PHP) dan frontend (TypeScript), serta generator nomor referensi
transaksi sekuensial per outlet per hari yang aman dari race condition.

## Kriteria Penerimaan

- [x] `App\Support\Money::format(12500)` → `"Rp 12.500"`
- [x] `App\Support\Money::parse('Rp 1.250.000')` → `1250000`
- [x] `App\Support\Money::round(12530)` → `12500`
- [x] `App\Support\Money::terbilang(12500)` → `"dua belas ribu lima ratus rupiah"`
- [x] `formatMoney(12500)` (TS) menghasilkan string identik dengan
      `Money::format(12500)` (PHP)
- [x] `App\Support\ReferenceGenerator::generate('INV', 1)` →
      `"INV-20260730-0001"`, panggilan kedua → `"...-0002"` (increment benar)
- [x] Tabel `reference_counters` ada (`prefix`, `outlet_id`, `date`,
      `last_number`, unique index gabungan)
- [x] Implementasi pakai `DB::transaction()` + `lockForUpdate()` (bukan
      `updateOrInsert` tanpa lock — rawan race condition saat 2 kasir
      transaksi bersamaan)

## Blocking Edges

- T-001 harus sudah selesai.

## Referensi

- CONTEXT.md § Istilah Teknis (Reference)
- `fase-00-v2.md` § 10–11
- `PROMPT-POS-SKILLAGE-MART.md` § Fase 0 (3. HELPER WAJIB)

## Catatan Implementasi

- `ReferenceGenerator` dipanggil lewat trait `HasReference` (T-003) di
  model — bukan dipanggil manual di tiap service, supaya konsisten di
  semua tabel transaksi (Sale, Purchase, CashierSession, dst) sejak
  Fase 1 dan seterusnya.
- Test konsistensi format PHP↔TS **wajib** ditambahkan saat Pest
  dikonfigurasi di Fase 18 (T-105) — belum ada test otomatis di Fase 0,
  baru diverifikasi manual via `tinker`.
