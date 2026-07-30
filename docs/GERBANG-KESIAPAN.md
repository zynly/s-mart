# GERBANG KESIAPAN NGODING

Dibuka: 2026-07-30
Status: **DIBUKA DENGAN CATATAN** — beberapa item pre-06 dilewati secara
sadar (lihat § Batasan) karena tidak relevan dengan cara kerja aktual
(Claude Code langsung sebagai asisten, bukan alur OpenCode+9Router yang
diasumsikan dokumen pre-coding asli).

## Ringkasan Kesiapan

Fase 0 (fondasi kode) **sudah selesai dan berjalan** sebelum dokumen
pre-coding dituntaskan — urutan terbalik dari yang disarankan
`README-pre-coding.md`. Dokumen pre-02/03/05 disusun **retroaktif**
setelah Fase 0, mensintesis keputusan yang sudah ada di
`README-v2.md`/`CATATAN-PERBAIKAN.md`/`PROMPT-POS-SKILLAGE-MART.md` —
bukan menciptakan requirement baru.

## Yang Sudah Siap

- ✅ **Environment lokal:** Laragon (PHP 8.2.32 — bukan 8.3 seperti target
  awal, tapi memenuhi syarat minimum Laravel 12 `^8.2`), Node v22
  (bukan v20 LTS seperti target awal, tapi kompatibel penuh dengan Vite
  7/Tailwind v4), MySQL 8.0.30, database `s_mart_dev` aktif.
- ✅ **Kode Fase 0 berjalan nyata:** Laravel 12 + Inertia v2 + React 19 +
  TypeScript strict + Tailwind v4 + shadcn/ui (Radix), terverifikasi
  lewat `tinker`, `pint`, `type-check`, `lint`, `build`, dan screenshot
  browser (light & dark mode, tanpa console error).
- ✅ **Dokumentasi domain:** `docs/CONTEXT.md` (kamus lengkap), `docs/SPEC.md`
  (9 bagian), **10 ADR** di `docs/adr/`.
- ✅ **Backlog kerja:** `docs/tickets/INDEX.md` — **119 tiket** terdaftar
  lintas 21 fase, dengan **14 tiket berdetail penuh** (5 Fase 0 selesai +
  9 jalur kritis). 105 tiket sisanya masih entri judul + blocking edges
  tingkat-fase — detail 7-bagian ditulis saat fase itu mulai dikerjakan
  (keputusan sadar, bukan kelalaian — lihat § Batasan).
- ✅ **Peta UI:** `docs/PETA-KOMPONEN.md` untuk 45 halaman, mencatat status
  nyata (11 komponen custom fondasi + 32 shadcn sudah terpasang; ~29
  komponen domain menyusul per-fase).

## Batasan yang Diakui Sadar

- **Backlog tiket belum 100% detail.** 105 dari 119 tiket baru berupa
  judul di `INDEX.md`, belum memenuhi kriteria pre-06 "setiap tiket
  punya kriteria penerimaan yang testable". Ini keputusan cakupan
  eksplisit pengguna di sesi ini ("CONTEXT+ADR+SPEC dulu, tiket
  menyusul") — bukan kelalaian.
- **pre-01 (Graphify) dan pre-04 (9Router) dilewati sepenuhnya.** Kedua
  tahap ini diasumsikan pakai tooling AI eksternal (Graphify untuk
  analisis repo referensi, 9Router untuk fallback multi-model) yang
  tidak dipakai dalam alur kerja aktual — Claude Code dipakai langsung
  tanpa router tambahan. Tidak ada `docs/CATATAN-REFERENSI.md`.
- **Git repo belum diinisialisasi.** `s-mart` belum jadi git repository
  (`git status` → "not a git repository"), apalagi push ke GitHub.
  Item ini butuh keputusan eksplisit pengguna (nama repo, privat/publik,
  remote) sebelum dieksekusi — belum dilakukan di sesi ini.
- **VSCode extension, SSH key, Python** dari pre-00 tidak diverifikasi —
  di luar cakupan kerja Claude Code terhadap kode proyek.
- Deploy target: shared hosting Hostinger (tanpa Redis, tanpa
  Supervisor, queue lewat cron — ADR-0008). Konsekuensi performa dipantau
  di Fase 8 dan diuji formal di Fase 18 (T-108).
- Payment gateway ditunda ke Fase 19+ (ADR-0010). Storefront hanya
  katalog (ADR-0009). Portal wali login HP + password tanpa OTP (T-096).

## Izin Melanjutkan

Dengan dokumen ini, pekerjaan boleh melanjut ke:
1. **Fase 1 (Autentikasi, Role & Pengguna)** — mulai dari T-006
   (`docs/tickets/T-006-migration-users-spatie-permission.md`)
2. Menulis detail penuh tiket T-007 s/d T-011 saat masing-masing mulai
   dikerjakan (bukan sekaligus di muka)
3. Inisialisasi git repo — **tunggu keputusan eksplisit pengguna**
   sebelum `git init`/push, karena ini aksi yang membuat state baru
   (repo, kemungkinan remote GitHub)

## Yang TIDAK Boleh Terjadi Selama Ngoding

- Menambah requirement baru tanpa update `SPEC.md` dan buat ADR baru
- Mengubah istilah domain tanpa update `CONTEXT.md`
- Menulis komponen custom padahal shadcn atau komponen fondasi Fase 0
  sudah menyediakan — cek `docs/PETA-KOMPONEN.md` § 6 dulu
- Menyalin pseudocode dari `PROMPT-POS-SKILLAGE-MART.md` (Fase 1–18)
  mentah-mentah tanpa mengecek koreksi di `CATATAN-PERBAIKAN.md` dan
  ADR terkait (beberapa contoh sudah usang — lihat T-026, T-045, T-080)
- Melewati checklist verifikasi manual di setiap tiket (backend:
  artisan/tinker/pint; frontend: type-check/lint/build; visual: browser)

## Tanggal Peninjauan Ulang

Ditinjau ulang setelah setiap 3 fase selesai (Fase 3, 6, 9, 12, 15, 18).
Bila ditemukan penyimpangan dari `SPEC.md`, dokumen di-refresh dulu
sebelum lanjut — termasuk kemungkinan menulis detail tiket yang masih
tertunda begitu fase terkait mulai.

---

## 🚦 Status Gerbang

**DIBUKA DENGAN CATATAN.** Boleh melanjutkan ke Fase 1, dengan kesadaran
penuh atas batasan di § Batasan di atas — terutama backlog tiket yang
belum tuntas 100% dan git repo yang belum diinisialisasi.

---

*Skillage Mart POS (s-mart) — Gerbang Kesiapan Ngoding, ditulis retroaktif
setelah Fase 0 selesai.*
