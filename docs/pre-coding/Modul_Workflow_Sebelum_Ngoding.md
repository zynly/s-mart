# MODUL WORKFLOW: PERSIAPAN SEBELUM NGODING

**Membangun Aplikasi Website Full-Stack dengan Bantuan AI Tools**

Tools yang diintegrasikan: **Graphify · Skills (Matt Pocock) · OpenCode · 9Router · shadcn/ui · Browser Use**

Disusun oleh: M. Zeydan Aly Aqshol Jihad, S.Kom — Kepala Jurusan PPLG, SMK Skill Village Islamic School (2026)

---

## Daftar Isi

1. [Tujuan Modul](#i-tujuan-modul)
2. [Filosofi: Kenapa Riset Dulu, Baru Ngoding](#ii-filosofi-kenapa-riset-dulu-baru-ngoding)
3. [Gambaran Umum Alur Kerja (Pipeline)](#iii-gambaran-umum-alur-kerja-pipeline)
4. [Tahap 1 — Memahami Codebase Referensi dengan Graphify](#iv-tahap-1--memahami-codebase-referensi-dengan-graphify)
5. [Tahap 2 — Menyelaraskan Requirement dengan Skills](#v-tahap-2--menyelaraskan-requirement-dengan-skills)
6. [Tahap 3 — Menyusun Spesifikasi & Tiket](#vi-tahap-3--menyusun-spesifikasi--tiket)
7. [Tahap 4 — Menyiapkan Infrastruktur AI (9Router)](#vii-tahap-4--menyiapkan-infrastruktur-ai-9router)
8. [Tahap 5 — Merancang Arsitektur & UI Kit (shadcn/ui)](#viii-tahap-5--merancang-arsitektur--ui-kit-shadcnui)
9. [Tahap 6 — Eksekusi Coding dengan OpenCode + TDD](#ix-tahap-6--eksekusi-coding-dengan-opencode--tdd)
10. [Tahap 7 — Verifikasi dengan Browser Use](#x-tahap-7--verifikasi-dengan-browser-use)
11. [Checklist Ringkas Sebelum Mulai Ngoding](#xi-checklist-ringkas-sebelum-mulai-ngoding)
12. [Lampiran: Perintah & Setup Cepat](#xii-lampiran-perintah--setup-cepat)

---

## I. Tujuan Modul

Modul ini adalah panduan praktis pribadi yang digunakan **sebelum** mulai menulis kode untuk aplikasi website full-stack. Tujuannya adalah memastikan setiap project dimulai dengan pemahaman yang jelas, requirement yang selaras, dan arsitektur yang matang — sebelum satu baris kode pun ditulis.

Modul ini menjawab lima pertanyaan inti sebelum coding:

1. Apakah saya sudah memahami codebase/referensi yang ada (jika melanjutkan atau mengadaptasi project lain)?
2. Apakah requirement sudah benar-benar jelas dan disepakati — bukan asumsi?
3. Apakah ada spesifikasi dan tiket kerja yang terstruktur?
4. Apakah infrastruktur AI (biaya, model, endpoint) sudah efisien dan siap dipakai?
5. Apakah arsitektur frontend/backend dan UI kit sudah direncanakan?

---

## II. Filosofi: Kenapa Riset Dulu, Baru Ngoding

Kesalahan paling umum saat membangun aplikasi dengan bantuan AI adalah langsung meminta AI menulis kode tanpa alignment yang jelas. Hasilnya: AI menulis sesuatu yang secara teknis berjalan, tapi tidak sesuai dengan apa yang sebenarnya diinginkan — dan itu baru diketahui setelah banyak waktu terbuang.

### Prinsip Utama

- **"No-one knows exactly what they want"** — kebutuhan sebenarnya baru muncul jelas lewat proses tanya-jawab (grilling), bukan di awal.
- **Rate of feedback adalah kecepatan sebenarnya** — langkah kecil dengan verifikasi konstan lebih cepat daripada langkah besar yang harus diulang.
- **Bahasa yang sama (shared language / domain model)** antara kamu dan AI mengurangi miskomunikasi dan token yang terbuang.
- **Software yang dibangun cepat dengan AI mempercepat juga entropi kode** — desain harus dijaga sejak awal, bukan diperbaiki belakangan.

> **Catatan:** Semua tahap dalam modul ini dilakukan SEBELUM OpenCode mulai menulis implementasi final. Coding aktual ada di Tahap 6 — lima tahap sebelumnya adalah persiapan.

---

## III. Gambaran Umum Alur Kerja (Pipeline)

Alur kerja end-to-end dari ide sampai kode pertama ditulis:

```
[1] GRAPHIFY          → Pahami codebase referensi / project existing
      ↓                  (skip jika project benar-benar dari nol)
[2] SKILLS: grill      → Selaraskan requirement lewat interview AI
    -with-docs           → hasil: domain model + CONTEXT.md + ADR
      ↓
[3] SKILLS: to-spec,   → Ubah hasil grilling jadi spesifikasi
    to-tickets           → lalu pecah jadi tiket kerja bertahap
      ↓
[4] 9ROUTER            → Setup routing model & efisiensi token
      ↓                  sebelum sesi coding panjang dimulai
[5] shadcn/ui          → Rancang arsitektur UI & component plan
      ↓                  (wireframe komponen, bukan kode dulu)
[6] OPENCODE + TDD     → Eksekusi coding, tiket demi tiket
      ↓                  (skill: /tdd, /code-review)
[7] BROWSER USE        → Verifikasi end-to-end di browser asli
                         (QA otomatis sebelum dianggap "selesai")
```

---

## IV. Tahap 1 — Memahami Codebase Referensi dengan Graphify

Gunakan tahap ini jika project baru dibangun di atas boilerplate, template, atau melanjutkan codebase yang sudah ada (termasuk hasil clone dari repo open-source sebagai referensi arsitektur). Jika project benar-benar dari nol tanpa referensi kode apa pun, tahap ini bisa dilewati langsung ke Tahap 2.

### Kenapa Graphify, Bukan Membaca Manual

- Graphify membangun knowledge graph dari code, docs, dan diagram — mengungkap struktur dan alasan desain, bukan cuma isi file.
- Fitur "god nodes" langsung menunjukkan class/fungsi paling sentral dalam sistem — titik awal yang tepat untuk dipahami lebih dulu.
- Fitur "surprise edges" mengungkap koneksi antar-modul yang tidak terduga — sering kali sumber bug tersembunyi.
- Hemat token signifikan (klaim ~71.5× reduction pada corpus uji) dibanding melempar seluruh source code ke context AI.

### Langkah Praktis

```bash
pip install graphifyy && graphify install

# Jalankan pada folder project referensi
/graphify ./nama-project-referensi

# Output ada di graphify-out/
graphify-out/
├── graph.html        # buka di browser, jelajahi visual
├── GRAPH_REPORT.md   # baca dulu bagian "god nodes" & "surprises"
└── graph.json        # untuk query lanjutan
```

### Yang Perlu Dicatat Sebelum Lanjut

1. Daftar 3–5 god nodes utama beserta perannya masing-masing.
2. Daftar surprise edges yang relevan — apakah itu bug, atau justru desain yang disengaja?
3. Ringkasan pola arsitektur yang dipakai (MVC? layered? modular monolith?).

> **Catatan:** Graphify tidak mengirim raw source code ke LLM — hanya deskripsi semantik. Aman untuk kode privat/berbayar.

---

## V. Tahap 2 — Menyelaraskan Requirement dengan Skills

Tahap paling penting dan paling sering dilewati orang. Sebelum menulis satu tiket kerja pun, requirement harus digali sampai jelas lewat proses tanya-jawab terstruktur menggunakan perintah `/grill-with-docs` dari Skills (Matt Pocock).

### Kenapa Grilling, Bukan Langsung Brief Singkat

Brief singkat seperti "buatkan aplikasi e-commerce" menyisakan puluhan keputusan tersembunyi: metode pembayaran apa saja, bagaimana menangani stok habis, siapa saja role pengguna, dsb. `/grill-with-docs` memaksa AI menanyakan semua ini satu per satu sampai tidak ada cabang keputusan yang tersisa — sekaligus membangun `CONTEXT.md` (bahasa bersama/domain model) dan ADR (Architectural Decision Record) untuk keputusan yang sulit dijelaskan ulang nanti.

### Langkah Praktis

```bash
# Sekali per repo, jalankan dulu:
/setup-matt-pocock-skills
# → pilih issue tracker (GitHub/Linear/local files)
# → tentukan label triase
# → tentukan lokasi dokumen (docs/)

# Mulai sesi grilling untuk fitur/aplikasi baru:
/grill-with-docs

# Contoh topik yang akan ditanyakan AI:
# - Siapa saja jenis pengguna (role) dalam sistem ini?
# - Bagaimana alur autentikasi (email/password? OAuth? keduanya)?
# - Apa yang terjadi jika terjadi error di tengah transaksi?
# - Data apa yang perlu di-cache, dan seberapa lama?
```

### Output yang Harus Dihasilkan

- **CONTEXT.md** — daftar istilah domain dan artinya, dipakai konsisten di seluruh kode.
- **ADR (Architectural Decision Record)** — untuk keputusan besar seperti pilihan database, auth strategy, dsb.
- **Catatan requirement final** — versi yang sudah tidak berubah-ubah, siap dipecah jadi tiket.

---

## VI. Tahap 3 — Menyusun Spesifikasi & Tiket

Setelah requirement selesai digali, hasil percakapan diubah menjadi spesifikasi formal, lalu dipecah menjadi tiket kerja kecil (tracer-bullet tickets) yang saling terhubung lewat dependency.

### Langkah Praktis

```bash
# Ubah hasil grilling menjadi spesifikasi
/to-spec
# → tidak ada interview lagi, hanya sintesis dari yang sudah dibahas

# Pecah spesifikasi jadi tiket kerja
/to-tickets
# → setiap tiket mendeklarasikan "blocking edges" (tiket mana
#   yang harus selesai dulu sebelum tiket ini bisa dikerjakan)
```

### Struktur Tiket yang Baik

| Elemen Tiket | Contoh Isi |
|---|---|
| Judul | Implementasi login dengan email & password |
| Acceptance Criteria | User bisa login, dapat error message jelas jika salah, session tersimpan |
| Blocking Edge | Menunggu tiket "Setup database schema users" selesai |
| Estimasi Kompleksitas | Kecil / Sedang / Besar |

### Untuk Project Besar

Jika scope pekerjaan terlalu besar untuk satu sesi agent, gunakan `/wayfinder` — merencanakan pekerjaan sebagai peta tiket investigasi bertahap di issue tracker, diselesaikan satu per satu sampai jalan ke tujuan akhir jelas.

---

## VII. Tahap 4 — Menyiapkan Infrastruktur AI (9Router)

Sebelum sesi coding panjang dimulai (Tahap 6), siapkan dulu routing model AI supaya biaya dan kuota terkendali — terutama untuk sesi OpenCode yang bisa berjalan lama dan menghabiskan banyak token.

### Langkah Praktis

```bash
npm install -g 9router
9router
# Dashboard: http://localhost:20128

# Di dashboard:
# 1. Connect provider gratis (Kiro AI / OpenCode Free / Vertex AI)
# 2. Aktifkan RTK Token Saver (default ON, hemat 20-40% token)
# 3. Buat combo fallback, misalnya:
#    subscription utama → model murah (GLM/MiniMax) → free tier

# Arahkan OpenCode / Claude Code ke endpoint 9Router:
# Endpoint: http://localhost:20128/v1
# API Key : (copy dari dashboard)
```

### Kombinasi yang Disarankan untuk Sesi Coding Panjang

| Tier | Model | Kapan Dipakai |
|---|---|---|
| 1. Utama | Model premium (subscription) | Implementasi kompleks, keputusan arsitektur |
| 2. Cadangan murah | GLM-5.1 / MiniMax M2.7 | Task rutin — CRUD, boilerplate |
| 3. Darurat gratis | Kiro AI / OpenCode Free | Kuota tier 1 & 2 habis, tetap lanjut kerja |

> **Catatan:** Cek dashboard 9Router secara berkala selama Tahap 6 — pantau kuota agar tidak mendadak terhenti di tengah sesi.

---

## VIII. Tahap 5 — Merancang Arsitektur & UI Kit (shadcn/ui)

Sebelum OpenCode menulis kode UI, tentukan dulu peta komponen yang dibutuhkan dan bagaimana mereka akan disusun. Ini mencegah AI membuat komponen custom dari nol padahal sudah tersedia versi siap pakai dari shadcn/ui.

### Langkah Praktis

1. Buat daftar semua layar/halaman yang dibutuhkan aplikasi (dari hasil spec Tahap 3).
2. Untuk setiap layar, identifikasi komponen UI yang diperlukan (form, table, dialog, dsb).
3. Cocokkan dengan komponen shadcn/ui yang tersedia — catat mana yang perlu di-custom.
4. Install hanya komponen yang benar-benar dipakai (bukan seluruh library sekaligus).

```bash
npx shadcn-ui@latest init

# Install sesuai peta komponen yang sudah direncanakan, contoh:
npx shadcn-ui@latest add button card input dialog table \
  toast dropdown-menu select tabs
```

### Contoh Peta Komponen (Diisi Sebelum Coding)

| Halaman | Komponen shadcn/ui | Custom Tambahan |
|---|---|---|
| Login / Register | Card, Input, Button, Toast | Validasi form dengan Zod |
| Dashboard | Table, Badge, Tabs, Progress | Chart custom (recharts) |
| Detail Produk | Carousel, Tooltip, Sheet | Galeri gambar custom |

---

## IX. Tahap 6 — Eksekusi Coding dengan OpenCode + TDD

Ini satu-satunya tahap yang benar-benar menulis kode. Semua tahap sebelumnya memastikan tahap ini berjalan lancar tanpa banyak revisi besar.

### Alur Eksekusi per Tiket

1. Buka tiket pertama (yang tidak punya blocking edge / dependency).
2. Jalankan `/tdd` untuk tiket tersebut — AI menulis test gagal dulu (RED).
3. OpenCode mengimplementasikan kode minimal agar test lulus (GREEN).
4. Refactor jika perlu, tetap jaga test tetap hijau (REFACTOR).
5. Jalankan `/code-review` — cek dua aspek: kepatuhan standar kode & kesesuaian dengan spec tiket.
6. Commit, lanjut ke tiket berikutnya.

### Kapan Menjalankan /improve-codebase-architecture

Jalankan setiap beberapa hari (bukan setiap tiket) untuk memindai peluang perbaikan struktur kode, sebelum project terlanjur menjadi "ball of mud". Hasilnya berupa laporan visual HTML yang bisa langsung digrilling untuk memilih perbaikan mana yang dieksekusi.

> **Catatan:** Gunakan mode `plan` OpenCode untuk eksplorasi/analisis codebase, dan mode `build` hanya saat siap mengeksekusi perubahan.

---

## X. Tahap 7 — Verifikasi dengan Browser Use

Setelah satu batch fitur selesai diimplementasikan, verifikasi end-to-end di browser sungguhan menggunakan Browser Use — bukan sekadar percaya test unit sudah cukup.

### Skenario Verifikasi Minimum

- Alur registrasi & login (happy path + skenario error umum).
- Fungsi inti aplikasi sesuai spec Tahap 3 (misal: checkout, submit form, upload file).
- Responsivitas di beberapa ukuran layar (mobile, tablet, desktop).
- Regresi visual — pastikan perubahan terbaru tidak merusak tampilan halaman lain.

### Contoh Script Verifikasi

```python
from browser_use import Agent, ChatBrowserUse
import asyncio

async def main():
    agent = Agent(
        task="Login dengan email test@example.com, lalu verifikasi "
             "dashboard menampilkan nama user di pojok kanan atas",
        llm=ChatBrowserUse(model='openai/gpt-5.5'),
    )
    result = await agent.run()
    print(result)

asyncio.run(main())
```

> **Catatan:** Jika ditemukan bug saat verifikasi, jalankan `/diagnosing-bugs` (Skills) untuk loop diagnosis sistematis, bukan tebak-tebakan.

---

## XI. Checklist Ringkas Sebelum Mulai Ngoding

Gunakan checklist ini sebagai gerbang terakhir sebelum menyentuh Tahap 6:

- [ ] Codebase referensi (jika ada) sudah dipetakan dengan Graphify — god nodes & surprise edges dicatat
- [ ] Sesi `/grill-with-docs` sudah selesai, CONTEXT.md dan ADR sudah tersimpan
- [ ] Spesifikasi final sudah dikonversi dengan `/to-spec`
- [ ] Tiket kerja sudah dipecah dengan `/to-tickets`, blocking edges sudah jelas
- [ ] 9Router sudah aktif dengan fallback combo yang sesuai budget
- [ ] Peta komponen shadcn/ui per halaman sudah dibuat
- [ ] Skenario verifikasi Browser Use untuk fitur utama sudah didaftar (belum dijalankan, cukup direncanakan)

---

## XII. Lampiran: Perintah & Setup Cepat

### A. Graphify

```bash
pip install graphifyy && graphify install
/graphify ./nama-project
```

### B. Skills (Matt Pocock)

```bash
/setup-matt-pocock-skills        # sekali per repo
/grill-with-docs                 # selaraskan requirement + domain model
/to-spec                         # jadikan spesifikasi
/to-tickets                      # pecah jadi tiket
/tdd                              # loop red-green-refactor per tiket
/code-review                     # review standar + spec compliance
/diagnosing-bugs                 # diagnosis bug sistematis
/improve-codebase-architecture   # scan & perbaiki arsitektur
```

### C. 9Router

```bash
npm install -g 9router
9router
# Dashboard: http://localhost:20128
```

### D. shadcn/ui

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add [nama-komponen]
```

### E. OpenCode

```bash
curl -fsSL https://opencode.ai/install | bash
opencode   # buka Terminal UI, Tab untuk ganti mode build/plan
```

### F. Browser Use

```bash
uv add browser-use
# atau: pip install browser-use
# isi .env dengan API key model pilihan
```

---

*— Selesai —*
