# PRE-06 — GERBANG KESIAPAN NGODING

**Tujuan:** verifikasi menyeluruh bahwa semua fondasi sudah tegak sebelum
Ziyad menyentuh baris kode aplikasi pertama (Fase 0 di `prompts/fase-00.md`).

**Estimasi waktu:** 15 menit.
**Prasyarat:** pre-00 sampai pre-05 sudah dijalankan (pre-01 opsional).
**Output:** `docs/GERBANG-KESIAPAN.md`.

**Aturan main:** kalau **ada satu saja** item di bawah yang tidak tercentang,
**jangan mulai ngoding**. Kembali ke tahap yang bermasalah.

---

## 1. VERIFIKASI ARTEFAK YANG WAJIB ADA

Jalankan di root proyek:

```powershell
# Verifikasi struktur folder & file
Get-ChildItem -Recurse -File docs | Select-Object FullName
```

Harus muncul minimal:

```
docs/CONTEXT.md                     ✓ dari pre-02
docs/SPEC.md                        ✓ dari pre-03
docs/PETA-KOMPONEN.md               ✓ dari pre-05
docs/README-pre-coding.md           ✓ (dari file ini)
docs/adr/0001-*.md ... 0010-*.md    ✓ minimal 10, dari pre-02
docs/tickets/T-001-*.md ... T-NNN   ✓ minimal 80, dari pre-03
docs/tickets/INDEX.md               ✓ dari pre-03
docs/CATATAN-REFERENSI.md           (opsional) dari pre-01
```

Kalau ada yang hilang, kembali ke tahap yang bersangkutan.

---

## 2. SANITY CHECK ARTEFAK

Lakukan review cepat masing-masing dokumen. Jangan skip.

### 2.1 `CONTEXT.md`

- [ ] Punya tabel Aktor (minimal 8 aktor)
- [ ] Punya tabel Uang & Saldo
- [ ] Punya tabel Transaksi
- [ ] Punya tabel Persediaan
- [ ] Punya bagian Storefront & Portal Wali
- [ ] Punya bagian "Istilah yang DILARANG"
- [ ] Tidak ada istilah yang muncul dua kali dengan definisi berbeda
- [ ] Semua istilah UI (Indonesia) punya padanan istilah kode (Inggris)

### 2.2 `SPEC.md`

- [ ] Punya Ringkasan Eksekutif (1 paragraf)
- [ ] Punya section Aktor & Peran
- [ ] Punya Domain Utama
- [ ] Punya Aturan Bisnis Kritis
- [ ] Punya Batasan Teknis (shared hosting, dst)
- [ ] Punya Peta Modul (18 fase + storefront + portal wali)
- [ ] Punya Kriteria Penerimaan per Modul
- [ ] Punya **Non-Goals** dengan minimal 8 item
- [ ] Punya Referensi ke ADR
- [ ] TIDAK ada blok "⚠️ KONFLIK" tersisa

### 2.3 ADR

- [ ] Minimal 10 ADR ada di `docs/adr/`
- [ ] ADR 0001 tentang Inertia+React ada
- [ ] ADR tentang MySQL 8 ada
- [ ] ADR tentang deposit-sebagai-kewajiban ada
- [ ] ADR tentang FEFO layer ada
- [ ] ADR tentang kredit-vs-allow_negative ada (harus MEMILIH SATU)
- [ ] ADR tentang model konsinyasi ada (murni vs beli-saat-terjual)
- [ ] ADR tentang retur pasca-tutup-sesi ada
- [ ] ADR tentang shared hosting Hostinger ada
- [ ] ADR tentang storefront stack ada
- [ ] ADR tentang payment gateway ditunda ada
- [ ] Setiap ADR punya section: Status, Konteks, Keputusan, Alternatif,
      Konsekuensi, Peninjauan Ulang

### 2.4 Backlog Tiket

- [ ] Minimal 80 tiket di `docs/tickets/` (idealnya 100–130)
- [ ] Setiap tiket punya kriteria penerimaan yang testable (bisa dicek objektif)
- [ ] Setiap tiket punya blocking edges yang jelas
- [ ] `INDEX.md` mengelompokkan tiket per fase
- [ ] "10 tiket kritis" (critical path) sudah ditandai di INDEX.md
- [ ] Semua tiket pakai istilah dari `CONTEXT.md`, tidak ada istilah liar

### 2.5 `PETA-KOMPONEN.md`

- [ ] Menyebutkan minimal 40 halaman dengan komponen shadcn-nya
- [ ] Setiap halaman punya minimal 3 field: shadcn components, custom, layout
- [ ] 5 layout terdaftar
- [ ] 16 komponen custom dengan basis shadcn-nya ada di list
- [ ] Daftar install shadcn (~32) dan daftar npm library tambahan lengkap

### 2.6 `CATATAN-REFERENSI.md` (opsional)

Bila pre-01 dijalankan:
- [ ] Menyebutkan repo yang dipelajari
- [ ] Punya bagian God Nodes
- [ ] Punya bagian Surprise Edges
- [ ] Punya bagian "Pelajaran untuk Skillage Mart"

Bila pre-01 dilewati:
- [ ] `CATATAN-REFERENSI.md` berisi 1 baris keterangan tentang skip

---

## 3. VERIFIKASI ENVIRONMENT (dari pre-00)

Cepat, jalankan di PowerShell:

```powershell
php -v          # 8.3.x
composer -V     # 2.x
node -v         # v20.x
npm -v          # 10.x
git --version   # 2.x
python --version  # 3.12.x
```

- [ ] Semua perintah di atas menampilkan versi yang benar
- [ ] Laragon Apache + MySQL menyala hijau
- [ ] Database `skillage_mart_dev` ada di HeidiSQL
- [ ] VSCode ter-install, extension wajib aktif
- [ ] `ssh -T git@github.com` berhasil autentikasi

---

## 4. VERIFIKASI 9ROUTER (dari pre-04)

- [ ] Proses `9router` berjalan (buka `http://localhost:20128`)
- [ ] Minimal 3 tier ter-connect
- [ ] Combo `skillage-coding` aktif
- [ ] Uji sanity request muncul di dashboard
- [ ] OpenCode (atau Claude Code CLI) sudah tahu endpoint

---

## 5. VERIFIKASI REPO GIT

```powershell
cd C:\laragon\www\skillage-mart
git status
git log --oneline -10
```

- [ ] `git status` bersih (tidak ada uncommitted changes yang penting)
- [ ] `git log` menampilkan minimal 3 commit terakhir untuk dokumen
      persiapan
- [ ] Push ke GitHub sudah dilakukan minimal untuk commit terakhir
- [ ] Repo di GitHub **status Private** (verifikasi via web GitHub)

---

## 6. UJI COBA GRILLING KECIL

Untuk memastikan AI siap melanjutkan dari titik ini, buka OpenCode/Claude Code
dan uji dengan permintaan:

```
Berdasarkan docs/SPEC.md, docs/CONTEXT.md, dan docs/adr/*.md di repo ini,
jawab: apa yang terjadi ketika seorang santri (Member type=santri) mencoba
bayar Rp 15.000 pakai saldo deposit padahal saldonya cuma Rp 10.000?

Jangan asumsi. Kalau dokumen tidak menjawab lengkap, sebutkan mana yang
belum jelas.
```

- [ ] AI berhasil menjawab dengan alur konkret (bukan generik)
- [ ] Jawaban AI menggunakan istilah dari CONTEXT.md (Member, saldo deposit,
      dst — bukan "user", "balance")
- [ ] AI merujuk ke ADR spesifik untuk keputusan (misal: allow_negative vs kredit)
- [ ] Kalau AI menyebut ada yang belum jelas, catat dan selesaikan sebelum
      ngoding — jangan lanjut dengan lubang ini terbuka

---

## 7. TULIS `docs/GERBANG-KESIAPAN.md`

Setelah semua tercentang, tulis file penutup ini:

```markdown
# GERBANG KESIAPAN NGODING

Dibuka: [tanggal]
Oleh: Ziyad Fernanda

## Ringkasan Kesiapan

Semua tahap persiapan (pre-00 sampai pre-06) telah dilewati. Verifikasi
tercatat di README-pre-coding.md.

## Yang Sudah Siap

- Environment lokal: Laragon + VSCode + Git + Python
- Dokumentasi domain: CONTEXT.md, SPEC.md, 12 ADR
- Backlog kerja: NNN tiket di docs/tickets/
- Peta UI: PETA-KOMPONEN.md untuk 45 halaman
- Infrastruktur AI: 9Router aktif dengan combo fallback
- Repo GitHub private dengan commit yang bersih

## Batasan yang Diakui Sadar

- Deploy target: shared hosting Hostinger (tanpa Redis, tanpa Supervisor,
  queue lewat cron). Konsekuensi: layar kasir mungkin terasa 200-500ms
  per aksi. Dipantau di Fase 8. Bila tidak cukup, upgrade VPS setelah bulan 6.
- Payment gateway ditunda ke Fase 19+. MVP hanya manual top-up.
- Storefront hanya katalog, tidak ada belanja online.
- Portal wali login pakai HP + password (tanpa OTP WhatsApp di MVP).

## Ijin Melanjutkan

Dengan menandatangani gerbang ini (via commit), Ziyad boleh:
1. Membuka `prompts/URUTAN-KERJA.md`
2. Memulai Sesi 1 (Fase 0 — Fondasi Proyek)
3. Menjalankan tiket T-001 sampai T-005 di sesi tersebut

## Yang TIDAK Boleh Terjadi Selama Ngoding

- Menambah requirement baru tanpa update SPEC.md dan buat ADR baru
- Mengubah istilah domain tanpa update CONTEXT.md
- Menulis komponen custom padahal shadcn sudah menyediakan (cek PETA-KOMPONEN.md)
- Melewati fase tanpa commit yang bersih
- Melewati checklist verifikasi di setiap prompt fase

## Tanggal Peninjauan Ulang

Gerbang ini ditinjau ulang setelah **setiap 3 fase selesai** (Fase 2, 5, 8,
11, 14, 17, 18). Kalau ada penyimpangan dari SPEC.md, dokumen di-refresh
lebih dulu sebelum lanjut.
```

Commit final:

```powershell
cd C:\laragon\www\skillage-mart
git add docs/GERBANG-KESIAPAN.md
git commit -m "docs: gerbang kesiapan ngoding dibuka"
git push
```

---

## CHECKLIST FINAL

Ini gerbang terakhir. **Semua wajib tercentang.**

### Artefak
- [ ] `docs/CONTEXT.md` verified (§ 2.1)
- [ ] `docs/SPEC.md` verified (§ 2.2)
- [ ] Minimal 10 ADR verified (§ 2.3)
- [ ] Minimal 80 tiket + INDEX.md verified (§ 2.4)
- [ ] `docs/PETA-KOMPONEN.md` verified (§ 2.5)
- [ ] `docs/CATATAN-REFERENSI.md` ada (isi atau skip note) (§ 2.6)

### Environment
- [ ] Semua CLI tool bekerja (§ 3)
- [ ] Laragon + DB + VSCode + Git siap (§ 3)

### AI Infrastructure
- [ ] 9Router jalan dengan minimal 3 tier + combo (§ 4)

### Repo
- [ ] Git clean, push terakhir sukses, repo private (§ 5)

### Uji Coba
- [ ] Grilling kecil berhasil, AI paham konteks proyek (§ 6)

### Penutup
- [ ] `docs/GERBANG-KESIAPAN.md` ditulis dan di-commit (§ 7)

---

## 🚦 LAMPU HIJAU

Jika **SEMUA** di atas tercentang:

**Ziyad boleh membuka `prompts/URUTAN-KERJA.md` dan mulai Fase 0.**

Selamat ngoding. Ingat: satu fase = satu sesi. Jangan menyambung fase dalam
sesi yang sama. Commit setelah tiap fase.

---

*Skillage Mart POS — Gerbang Kesiapan Ngoding*
