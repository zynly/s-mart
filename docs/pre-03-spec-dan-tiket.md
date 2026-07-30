# PRE-03 — SPESIFIKASI & TIKET KERJA

**Tujuan:** mengubah hasil grilling (`CONTEXT.md` + ADR) jadi **satu
spesifikasi formal (`SPEC.md`)** yang bisa dijadikan patokan, lalu memecahnya
jadi backlog tiket kecil yang bisa dieksekusi satu-per-satu di Fase 6 (coding).

**Estimasi waktu:** 90 menit.
**Prasyarat:** pre-02 selesai, `CONTEXT.md` dan minimal 10 ADR sudah ada.

**Output:**
- `docs/SPEC.md` — spesifikasi final (single source of truth)
- `docs/tickets/T-001-*.md` sampai `docs/tickets/T-NNN-*.md` — backlog tiket

---

## 1. GENERATE `docs/SPEC.md`

Di dalam sesi Claude Code / OpenCode, jalankan:

```
/to-spec

Basis:
- docs/CONTEXT.md
- docs/adr/*.md
- prompts/fase-00.md sampai fase-18.md
- prompts/fase-ui-01-perbaikan-navigasi.md
- docs/CATATAN-REFERENSI.md (bila ada)

Hasilkan docs/SPEC.md dengan struktur:
1. Ringkasan Eksekutif (1 paragraf)
2. Aktor & Peran
3. Domain Utama (mengikuti CONTEXT.md)
4. Aturan Bisnis Kritis (yang tidak boleh dilanggar)
5. Batasan Teknis (shared hosting, no Redis, dst)
6. Peta Modul (18 fase + storefront + portal wali)
7. Kriteria Penerimaan per Modul
8. Non-Goals (yang secara eksplisit BUKAN scope)
9. Referensi ke ADR (untuk keputusan besar)

Bahasa: Indonesia untuk narasi, Inggris untuk nama teknis.
Tidak boleh menciptakan requirement baru — hanya sintesis dari input.
Bila ada konflik antar input, tandai dengan blok "⚠️ KONFLIK" dan
sertakan pertanyaan untuk diklarifikasi.
```

### 1.1 Review hasil

- Baca `SPEC.md` dari awal sampai akhir tanpa interupsi.
- Cari kalimat yang terasa asing, tidak sesuai memori Ziyad. Tandai.
- Cari blok "⚠️ KONFLIK" bila ada — selesaikan sebelum lanjut.
- **Jangan minta AI merevisi berulang-ulang.** Kalau ada lebih dari 5 hal
  yang perlu direvisi, artinya ada masalah di CONTEXT.md atau ADR — kembali
  ke pre-02.

### 1.2 Bagian "Non-Goals" — jangan dilewati

Ini yang paling sering diabaikan tapi paling menyelamatkan. Contoh yang wajib
masuk untuk Skillage Mart:

```markdown
## Non-Goals

Berikut yang **SECARA EKSPLISIT BUKAN** scope MVP:

- ❌ Belanja online (checkout via storefront) — hanya katalog
- ❌ Sistem pengantaran barang ke asrama atau rumah wali
- ❌ Payment gateway otomatis untuk top-up (Fase 19+, tidak di MVP)
- ❌ Multi-tenant / multi-sekolah — hanya Skillage Mart
- ❌ Aplikasi mobile native — hanya web responsif + PWA lite
- ❌ Sistem POS untuk warung/kios di luar Skillage Mart
- ❌ Integrasi timbangan digital (produk curah)
- ❌ Integrasi mesin EDC bank real (nomor approval diinput manual)
- ❌ Loyalty program tingkat lanjut (tier, gamification)
- ❌ Manajemen SDM / payroll penuh (hanya potong gaji sederhana)
```

Non-Goals melindungi Ziyad dari scope creep — permintaan "sekalian
tambahin fitur X" yang muncul di tengah project.

---

## 2. GENERATE BACKLOG TIKET

Setelah `SPEC.md` fix, pecah jadi tiket:

```
/to-tickets

Basis: docs/SPEC.md
Output: docs/tickets/T-NNN-slug.md

Aturan:
- Satu tiket = maksimal 1 hari kerja (8 jam) untuk Ziyad solo.
- Tiket yang lebih besar wajib dipecah.
- Setiap tiket mencantumkan blocking edges (tiket yang harus selesai duluan).
- Nomor urut T-001 sampai T-NNN, mengikuti urutan Fase 0–18.
- Format nama file: T-NNN-slug-pendek.md

Struktur tiap tiket:
1. Judul
2. Fase induk (Fase 0/1/2/...)
3. Deskripsi (2–4 kalimat)
4. Kriteria Penerimaan (checklist, testable)
5. Blocking Edges (daftar T-XXX yang harus selesai lebih dulu)
6. Estimasi (S/M/L: Small ≤2 jam, Medium ≤4 jam, Large ≤8 jam)
7. Referensi (ADR, section SPEC.md, prompts/fase-NN.md)
8. Catatan Implementasi (opsional, tips teknis)
```

### 2.1 Estimasi jumlah tiket

Berdasarkan 18 fase + fase-ui + storefront + portal wali:

| Fase | Tiket kasar |
|---|---|
| Fase 0 (fondasi) | 4–5 tiket |
| Fase 1 (auth & role) | 5–6 tiket |
| Fase 2 (master data) | 6–8 tiket |
| Fase 3 (anggota & kartu) | 5–7 tiket |
| Fase 4 (deposit) | 5–6 tiket |
| Fase 5 (inventory FEFO) | 4–5 tiket |
| Fase 6 (pembelian) | 6–7 tiket |
| Fase 7 (sesi kasir) | 4–5 tiket |
| Fase 8 (layar kasir) | 6–8 tiket |
| Fase 9 (pembayaran) | 5–7 tiket |
| Fase 10 (diskon & promo) | 6–8 tiket |
| Fase 11 (retur & void) | 4–5 tiket |
| Fase 12 (opname) | 4–5 tiket |
| Fase 13 (akuntansi) | 5–7 tiket |
| Fase 14 (laporan) | 6–8 tiket (bertahap, bukan sekaligus) |
| Fase 15 (dashboard) | 3–4 tiket |
| Fase 16 (portal wali) | 5–6 tiket |
| Fase 17 (pengaturan) | 3–4 tiket |
| Fase 18 (pengujian & deploy) | 5–6 tiket |
| Fase UI-01 (navigasi) | 3–4 tiket |
| Storefront publik (baru) | 4–5 tiket |

**Total: ~100–130 tiket.** Jangan kaget kalau banyak — proyek POS retail
memang skala segitu.

### 2.2 Contoh satu tiket

`docs/tickets/T-023-fefo-consume-service.md`:

```markdown
# T-023 — Implementasi FEFO consume di StockService

**Fase induk:** Fase 5 (Inventory FEFO)
**Estimasi:** M (≤4 jam)

## Deskripsi

Implementasi method `StockService::consume(Product, Outlet, float $qty,
Model $consumer): array` yang mengkonsumsi stok dengan urutan FEFO
(First Expired First Out), mencatat konsumsi per layer, dan mengembalikan
total HPP.

## Kriteria Penerimaan

- [ ] Method `consume()` di `app/Services/StockService.php` ada
- [ ] Urutan konsumsi: `expired_at ASC NULLS LAST, received_at ASC`
- [ ] Pakai `lockForUpdate()` pada layer yang dikonsumsi
- [ ] Setiap pengambilan dicatat ke tabel `stock_layer_consumptions`
- [ ] Bila stok tidak cukup, lempar `InsufficientStockException` dan
      rollback semua perubahan parsial
- [ ] Kembalikan array `['total_cost' => int, 'consumptions' => Collection]`
- [ ] Test unit: 5 skenario minimum (layer tunggal, multi-layer,
      tidak cukup, dengan expired, tanpa expired)

## Blocking Edges

- T-020 (tabel stock_layers) harus sudah selesai
- T-021 (tabel stock_layer_consumptions) harus sudah selesai
- T-022 (skeleton StockService) harus sudah selesai

## Referensi

- ADR-0004: Stok pakai FEFO Layer
- SPEC.md § "Aturan Bisnis Kritis > Stok & HPP"
- prompts/fase-05.md § 2 (SERVICE — StockService)

## Catatan Implementasi

- SQL urutan FEFO: `ORDER BY (expired_at IS NULL), expired_at ASC, received_at ASC`
  di MySQL. Jangan lupa parentheses — `IS NULL` menghasilkan 0/1.
- `lockForUpdate()` wajib di dalam `DB::transaction()`, jangan di luar.
- Jangan bikin `stock_movements` di service ini — itu tugas orkestrator
  (SaleService, PurchaseService) supaya konteksnya jelas.
```

### 2.3 Tips untuk backlog yang sehat

- **Nomor tiket immutable.** Sekali T-023 = FEFO consume, jangan diganti
  isinya jadi hal lain. Kalau tiket dibatalkan, jadi "T-023: [CANCELLED]".
- **Jangan menganggap "estimasi = janji".** Estimasi = ekspektasi optimis
  Ziyad hari itu. Realisasi bisa 1.5x–2x. Wajar.
- **Kalau blocking edges menumpuk jadi rantai panjang**, cari kemungkinan
  paralelisasi. Contoh: fase-16 (portal wali) bisa jalan paralel dengan
  fase-14 (laporan) karena tidak saling bergantung.
- **Setiap tiket idealnya menghasilkan minimal satu commit yang aman
  di-review.** Kalau tiket menghasilkan 8 commit acak, terlalu besar —
  pecah lagi.

---

## 3. INDEX BACKLOG

Buat `docs/tickets/INDEX.md` sebagai peta backlog:

```markdown
# Backlog Skillage Mart POS

Total: NNN tiket (isi angka aktual)

## Legenda Status
- ⬜ Belum mulai
- 🟨 Sedang dikerjakan
- ✅ Selesai
- ⛔ Dibatalkan

## Fase 0 — Fondasi Proyek
- [ ] T-001 — Instalasi Laravel 12 + Inertia + React
- [ ] T-002 — Konfigurasi Tailwind + palet navy
- [ ] T-003 — Struktur folder & namespace
- [ ] T-004 — Helper Money.ts (frontend) & Money.php (backend)
- [ ] T-005 — Helper ReferenceGenerator

## Fase 1 — Autentikasi & Role
- [ ] T-006 — Migration users + tabel spatie/permission
- [ ] T-007 — Seeder roles & permissions (7 role)
- [ ] T-008 — Layar login (React page + Blade root)
- ...

(dan seterusnya)
```

---

## 4. PRIORITAS EKSEKUSI

Dari 100+ tiket, tandai **10 tiket terpenting** yang mempengaruhi paling
banyak tiket lain. Ini "critical path" Ziyad.

Kandidat berdasarkan analisis dependency:

1. T-001 — Instalasi Laravel 12 + Inertia + React (blok semua)
2. T-006 — Migration users + spatie permission (blok semua auth)
3. T-018 — Migration products & barcodes (blok kasir, storefront, katalog)
4. T-020 — Tabel stock_layers (blok stok, penjualan, pembelian)
5. T-023 — FEFO consume di StockService (blok penjualan)
6. T-035 — DepositService dengan lockForUpdate (blok top-up & pembayaran deposit)
7. T-048 — CashierSessionService (blok layar kasir)
8. T-055 — SaleService::complete() (jantung kasir)
9. T-070 — PaymentService (blok pembayaran non-cash)
10. T-090 — JournalService (blok semua akuntansi)

Kalau salah satu dari 10 ini stuck > 2 hari, panggil bantuan
(saya, kolega, atau ganti pendekatan). Jangan biarkan critical path
berhenti > 48 jam.

---

## 5. TIPS UNTUK GRILLING TIKET

Kalau `/to-tickets` menghasilkan tiket yang terlalu vague, jangan diterima.
Bilang ke AI:

```
Tiket T-XXX terlalu vague. Kriteria penerimaan tidak testable.
Perbaiki dengan aturan:
- Setiap kriteria harus bisa diverifikasi lewat: (a) menjalankan test,
  (b) melihat file yang dibuat, (c) menjalankan perintah dan cek output,
  atau (d) membuka URL dan cek elemen tampil.
- Hindari kata "sesuai" / "benar" / "baik" tanpa definisi eksplisit.
```

---

## CHECKLIST VERIFIKASI

- [ ] `docs/SPEC.md` sudah ditulis, minimal 9 section lengkap
- [ ] Section "Non-Goals" jelas menyebut minimal 8 hal yang BUKAN scope
- [ ] Tidak ada blok "⚠️ KONFLIK" tersisa di `SPEC.md`
- [ ] Backlog tiket di `docs/tickets/` minimal 80 file, ideal 100–130
- [ ] Setiap tiket punya kriteria penerimaan yang testable
- [ ] Setiap tiket punya blocking edges yang jelas (bisa kosong bila entry-point)
- [ ] `docs/tickets/INDEX.md` sudah dibuat, mengelompokkan tiket per fase
- [ ] "10 tiket kritis" sudah diidentifikasi dan ditandai di INDEX.md
- [ ] Commit `docs: SPEC dan backlog tiket awal` sudah dilakukan
- [ ] Push ke GitHub berhasil

---

**Setelah selesai → lanjut ke `pre-04-setup-9router.md`.**
