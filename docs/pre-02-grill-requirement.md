# PRE-02 — GRILLING REQUIREMENT DENGAN SKILLS

**Tujuan:** membangun bahasa bersama (`CONTEXT.md`) dan mencatat keputusan
arsitektur besar (ADR) supaya seluruh keputusan implementasi konsisten dan
tidak "berubah-ubah karena lupa".

**Estimasi waktu:** 2–3 jam total. Jangan diselesaikan dalam satu duduk.
Pecah jadi 3 sesi × 45–60 menit dengan istirahat.

**Prasyarat:** pre-00 selesai. pre-01 opsional. Claude Code atau OpenCode aktif.

**Output yang dihasilkan:**
- `docs/CONTEXT.md` — kamus domain baku
- `docs/adr/0001-*.md` sampai `docs/adr/0010-*.md` — sekitar 10 ADR

---

## 1. SETUP SKILLS (SEKALI SAJA)

Buka terminal di root proyek, jalankan Claude Code atau OpenCode. Di dalam
sesi AI, jalankan:

```
/setup-matt-pocock-skills
```

Saat ditanya:

| Prompt | Jawaban |
|---|---|
| Issue tracker | **Local files** (kita simpan di `docs/tickets/` sendiri, tidak pakai GitHub Issues supaya bisa offline) |
| Label triase | `type/*`, `priority/*`, `phase/*` |
| Lokasi dokumen | `docs/` |
| Bahasa dokumentasi | **Indonesia** untuk semua narasi; **Inggris** untuk nama teknis (kelas, tabel, kolom) |

---

## 2. JALANKAN GRILLING

Grilling adalah sesi tanya-jawab intensif dengan AI. **Ziyad jadi yang
menjawab**, AI yang bertanya. Peran ini tidak boleh terbalik.

### 2.1 Buka sesi

```
/grill-with-docs

Topik: Aplikasi POS retail untuk minimarket sekolah SMK Skill Village
Islamic School (Skillage Mart), plus storefront publik katalog produk
dan portal wali santri. Stack: Laravel 12 + Inertia + React + TypeScript.
Deploy shared hosting.

Dokumen referensi yang sudah ada:
- docs/CATATAN-REFERENSI.md (jika pre-01 dijalankan)
- prompts/README.md, prompts/URUTAN-KERJA.md
- prompts/fase-00.md sampai prompts/fase-18.md
- prompts/fase-ui-01-perbaikan-navigasi.md

Silakan mulai bertanya dari yang paling fundamental. Fokus di keputusan
yang belum jelas atau ambigu di dokumen fase.
```

### 2.2 Bagi jadi 3 sesi

**SESI A — Domain & Aktor (45–60 menit)**

Topik yang harus AI gali sampai jelas:
- Siapa saja aktor sistem? Definisikan tepat: santri, wali santri, kasir,
  fasilitator kasir, admin, supervisor, warehouse, treasurer, owner, guest.
- Hubungan antar-aktor: siapa boleh melakukan apa, kepada siapa, dengan izin siapa.
- Alur "hari kehidupan" tiap aktor: pagi–siang–sore–malam apa yang mereka lakukan
  dengan sistem?
- Titik-titik keputusan yang belum jelas di dokumen fase.

**SESI B — Aturan Bisnis Kritis (45–60 menit)**

- Aturan saldo deposit: apakah saldo boleh minus? Sampai batas berapa? Untuk siapa?
- Aturan HPP: FEFO sudah, tapi bagaimana penanganan konsinyasi murni vs beli-saat-terjual?
- Aturan retur: batas hari, refund ke mana, siapa yang approve.
- Aturan void: kapan boleh, sampai kapan boleh, jurnal pembalik seperti apa.
- Aturan diskon: 3 tahap prioritas, batas HPP, konflik antar promo.
- Konflik yang muncul di review saya:
  - `allow_negative` (Fase 3) vs metode bayar Kredit (Fase 9) — pilih satu.
  - Retur pasca-tutup-sesi (Fase 11) belum jelas mekanismenya.
  - Konsinyasi jurnal (Fase 13) — model murni atau beli-saat-terjual?

**SESI C — Storefront, Portal Wali, & Deployment (45–60 menit)**

- Storefront publik: apa yang tampil, apa yang tidak. Harga tampil? Stok tampil?
- Portal wali: fitur minimum, fitur tambahan. Login HP + password saja atau ada OTP?
- Top-up: manual (upload bukti) sudah pasti; payment gateway kapan diaktifkan?
- Deployment: shared hosting Hostinger. Konsekuensi untuk arsitektur:
  tidak ada Redis, tidak ada worker supervisor, queue lewat cron. Bagaimana
  disiasati?
- Backup strategy: karena shared hosting, backup ke mana?
- Offline behavior: kalau internet mati, kasir berhenti — bagaimana onboarding
  ke tim yang tidak paham teknis?

### 2.3 Aturan main grilling

- **Jawab sejujurnya.** Kalau ragu, tulis "ragu, condong ke X karena Y".
  Jangan pura-pura yakin. Ini catatan pribadi Ziyad, tidak dinilai orang.
- **Kalau AI bertanya sesuatu yang Ziyad juga tidak tahu**, tulis: "belum
  diputuskan, akan diriset dulu". Jangan ngarang jawaban.
- **Kalau AI bertanya hal yang sama dua kali dengan cara berbeda**, itu tanda
  jawaban Ziyad sebelumnya belum konsisten. Cek ulang.
- **Jangan biarkan AI langsung menulis kode.** Kalau AI melenceng ke "mari
  saya buatkan migration untuk itu", stop dan kembalikan ke mode grilling.

---

## 3. HASIL AKHIR: `docs/CONTEXT.md`

Setelah 3 sesi grilling selesai, minta AI menyusun `CONTEXT.md`. Ini kamus
domain baku yang **tidak boleh diubah lagi** setelah dikunci.

Format yang saya sarankan:

```markdown
# CONTEXT.md — Kamus Domain Skillage Mart POS

Dokumen ini menetapkan istilah baku yang dipakai konsisten di seluruh kode,
UI, dokumentasi, dan komunikasi tim. Perubahan istilah wajib melalui
Pull Request dan diskusi eksplisit.

## Aktor

| Istilah UI (Indonesia) | Istilah Kode (English) | Definisi Singkat |
|---|---|---|
| Santri | `Member` (type: `santri`) | Pelajar SMK Skill Village, pemegang kartu utama |
| Wali santri | `Guardian` | Orang tua/wali dari 1+ santri |
| Kasir | `User` (role: `cashier`) | Operator layar kasir |
| Fasilitator | `Member` (type: `fasilitator`) | Guru — bisa beli & bisa jadi kasir |
| Staf | `Member` (type: `staff`) | Non-guru non-santri |
| Umum | `Member` (type: `public`) | Warga luar pesantren (jarang) |
| Owner | `User` (role: `owner`) | Kepala sekolah / penanggung jawab |
| Supervisor | `User` (role: `supervisor`) | Otorisasi PIN untuk void, dll |
| Warehouse | `User` (role: `warehouse`) | Penerimaan barang & opname |
| Bendahara | `User` (role: `treasurer`) | Kas, hutang, piutang, jurnal |
| Admin | `User` (role: `admin`) | Serba bisa kecuali eksklusif owner |

## Uang & Saldo

| Istilah UI | Istilah Kode | Definisi |
|---|---|---|
| Saldo | `deposit_balance` | Uang santri di sistem, sumber utama pembayaran |
| Top-up | `TopUp` / `deposit.topup` | Penambahan saldo santri |
| Ledger deposit | `DepositTransaction` | Baris append-only mutasi saldo |
| Kas | `CashAccount` | Wadah uang fisik: laci, brankas, bank, e-wallet |
| Laci | `CashAccount` (type=cash, is_drawer=true) | Kas fisik kasir |
| Brankas | `CashAccount` (type=cash, is_drawer=false) | Kas fisik non-laci |

## Transaksi

| Istilah UI | Istilah Kode | Definisi |
|---|---|---|
| Nota / Transaksi | `Sale` | Satu transaksi jual di kasir |
| Baris nota | `SaleItem` | Satu produk dalam nota |
| Hold | `SaleHold` | Nota yang di-pause |
| Void | `Sale.status = void` | Nota dibatalkan penuh |
| Retur | `SaleReturn` | Pengembalian barang sebagian atau penuh |
| Refund | (bagian dari SaleReturn) | Pengembalian nilai bayar, ikut metode asal |
| Sesi kasir | `CashierSession` | Periode kerja satu kasir di satu laci |

## Persediaan

| Istilah UI | Istilah Kode | Definisi |
|---|---|---|
| Produk | `Product` | Item yang dijual |
| SKU | `Product.sku` | Kode unik produk |
| Barcode | `ProductBarcode` | Kode barcode fisik (satu produk banyak barcode) |
| Stok | `Stock` (cache) + `StockLayer` (sumber kebenaran) | Sisa barang siap jual |
| Layer | `StockLayer` | Satu tumpukan stok dari satu penerimaan |
| FEFO | *First Expired First Out* | Metode konsumsi layer |
| HPP | `unit_cost` / `total_cost` | Harga Pokok Penjualan |
| Opname | `StockOpname` | Hitung fisik stok berkala |
| Konsinyasi | (flag `is_consignment`) | Barang titipan, milik supplier |

(dan seterusnya untuk seluruh domain)

## Storefront & Portal Wali

| Istilah UI | Istilah Kode | Definisi |
|---|---|---|
| Katalog | (halaman publik `/produk`) | Daftar produk publik |
| Portal Wali | (rute `/wali`) | Area login wali |
| Ajukan Top-Up | `TopupRequest` | Permohonan top-up dari wali via transfer manual |

## Istilah yang DILARANG

Supaya konsisten, istilah berikut **jangan dipakai** di kode maupun UI:

- ❌ "Pembeli" / "Customer" — pakai **Member** atau tipe spesifiknya (Santri, dll)
- ❌ "E-money" — pakai **Saldo Deposit** atau **Deposit**
- ❌ "Balance" mentah — selalu spesifik: **balance_cache** (kolom) atau
  **ledger sum** (agregasi)
- ❌ "Guru" — pakai **Fasilitator** (identitas sekolah)
```

---

## 4. HASIL AKHIR: ADR (Architectural Decision Record)

Setiap keputusan besar yang muncul di grilling dicatat sebagai satu file
`docs/adr/NNNN-judul-singkat.md`. Format standar:

```markdown
# ADR-0001: Inertia + React, bukan API + SPA terpisah

**Status:** Diterima
**Tanggal:** 2026-07-XX
**Konteks:** Solo developer, target: 1 aplikasi web POS + storefront +
portal wali dengan satu maintainer.

## Keputusan

Menggunakan **Inertia.js v2 dengan React 18 + TypeScript** sebagai lapisan
view, tetap dalam monolith Laravel 12.

## Alternatif yang Dipertimbangkan

1. Laravel + Livewire — cocok, tapi kalah HMR speed & type safety.
2. Laravel API + React SPA (Vite terpisah, TanStack Query) — overkill:
   butuh REST resource, auth token, CORS, dokumentasi OpenAPI.
3. Laravel + Blade + Alpine — cukup untuk storefront, tidak cukup untuk kasir.

## Konsekuensi

- Semua service Laravel bisa dipanggil langsung dari controller ke Inertia
  props tanpa API layer.
- TypeScript strict mode wajib supaya sinkronisasi type dengan backend
  terjaga (via type sharing manual atau ziggy + spatie/laravel-data).
- Bundle JS lebih besar dari Livewire, tapi masih wajar untuk shared hosting.

## Tanggal Peninjauan Ulang

Setelah Fase 8 (Layar Kasir) selesai. Bila performa React di shared hosting
tidak memenuhi target (>500ms scan-to-render), evaluasi kembali.
```

### Daftar ADR minimum yang wajib dibuat

Berdasarkan diskusi kita sebelumnya, ini sekitar 10 ADR yang wajib ada:

| # | Judul | Sumber Keputusan |
|---|---|---|
| 0001 | Inertia + React, bukan API + SPA terpisah | Diskusi sebelumnya |
| 0002 | MySQL 8, bukan PostgreSQL | Karena shared hosting biasanya MySQL |
| 0003 | Deposit sebagai kewajiban di jurnal, bukan pendapatan | Fase 13 |
| 0004 | Stok pakai FEFO Layer, bukan avg cost sederhana | Fase 5 |
| 0005 | Sistem Kredit Anggota, bukan `allow_negative` | Konflik yang saya temukan |
| 0006 | Konsinyasi model murni (barang bukan aset sekolah) | Konflik Fase 13 |
| 0007 | Retur pasca-tutup-sesi wajib refund non-tunai | Konflik Fase 11 |
| 0008 | Shared hosting Hostinger, migrasi ke VPS setelah bulan ke-6 | Diskusi kita |
| 0009 | Storefront pakai stack sama (React+Inertia), route publik | Keputusan Ziyad |
| 0010 | Payment gateway ditunda ke Fase 19+, MVP hanya manual top-up | Diskusi kita |

Setiap ADR ditulis dengan format yang sama seperti contoh di atas.

---

## 5. TIPS EFISIENSI

- **Rekam sesi grilling.** OpenCode/Claude Code sudah menyimpan history. Jangan
  tutup terminal tiba-tiba.
- **Kalau AI bertele-tele, potong dengan:** "Ringkas jawabanmu jadi maksimal 3
  poin. Jangan ulangi apa yang sudah kita bahas."
- **Kalau Ziyad kelelahan, berhenti.** Grilling yang dilakukan sambil ngantuk
  menghasilkan keputusan yang harus di-refactor kemudian. Rugi waktu.
- **Antara sesi, refresh.** Baca ulang hasil sesi sebelumnya sebelum lanjut,
  supaya AI melanjutkan dari titik yang sama.
- **Jangan takut mengubah jawaban sesi A saat di sesi B.** Kalau ada
  ketidakkonsistenan, catat sebagai "revisi ADR" — bukan berarti sesi A sia-sia.

---

## CHECKLIST VERIFIKASI

- [ ] `/setup-matt-pocock-skills` sudah dijalankan, konfigurasi tersimpan
- [ ] Sesi A (Domain & Aktor) selesai, tidak ada aktor yang undefined
- [ ] Sesi B (Aturan Bisnis) selesai, minimal 3 konflik di dokumen fase
      terselesaikan (allow_negative, konsinyasi, retur pasca-tutup)
- [ ] Sesi C (Storefront & Deployment) selesai, batas antar-area jelas
- [ ] `docs/CONTEXT.md` sudah ditulis lengkap dengan tabel aktor, uang,
      transaksi, persediaan, storefront, dan daftar istilah dilarang
- [ ] Minimal **10 ADR** sudah dibuat di `docs/adr/`
- [ ] Semua ADR mengikuti format standar (Status, Konteks, Keputusan,
      Alternatif, Konsekuensi, Peninjauan Ulang)
- [ ] `git add . && git commit -m "docs: context and ADR pertama"` sudah
      dijalankan
- [ ] Push ke GitHub berhasil

---

**Setelah selesai → lanjut ke `pre-03-spec-dan-tiket.md`.**
