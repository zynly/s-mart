# PRE-04 — SETUP 9ROUTER (INFRASTRUKTUR AI)

**Tujuan:** menyiapkan routing model AI supaya sesi coding Fase 6 (Fase 0–18
Skillage Mart) tidak mendadak berhenti di tengah karena kuota habis. Juga
menghemat biaya lewat token saver dan combo fallback.

**Estimasi waktu:** 30 menit.
**Prasyarat:** pre-00 selesai, Node.js 20 sudah ter-install.

---

## 1. INSTALASI

```powershell
npm install -g 9router
9router --version
```

Jalankan:

```powershell
9router
```

Buka dashboard di browser: **http://localhost:20128**

**Catatan:** proses 9router harus tetap jalan selama sesi coding. Buka di
terminal terpisah dan jangan ditutup. Kalau mesin di-restart, jalankan lagi.

---

## 2. CONNECT PROVIDER

Di dashboard, tab **Providers**, tambahkan minimal 3 tier supaya combo
fallback jalan:

### Tier 1 — Utama (untuk pekerjaan berat)

Pilih salah satu berdasarkan langganan aktif Ziyad:

| Provider | Model | Kekuatan |
|---|---|---|
| Anthropic Direct | Claude Opus / Sonnet | Reasoning terbaik untuk PromoEngine, JournalService |
| OpenAI Direct | GPT-5 / o1 | Alternatif kuat untuk arsitektur |
| Claude via subscription | Claude Code Pro | Kalau sudah berlangganan Pro |

Isi API key masing-masing. **Simpan key di password manager, jangan
di-commit.**

### Tier 2 — Cadangan murah (untuk task rutin)

| Provider | Model | Kenapa |
|---|---|---|
| **GLM-4.6 via Z.ai** | GLM-4.6 | Sangat murah, cukup baik untuk CRUD boilerplate |
| **DeepSeek** | DeepSeek-V3.5 | Murah + cukup baik untuk refactor & test |
| **MiniMax** | MiniMax M2.7 | Alternatif murah |

Cukup pilih 1 dari daftar ini.

### Tier 3 — Darurat gratis

| Provider | Model | Batasan |
|---|---|---|
| **Kiro AI** | Berbagai model | Rate limit ketat, tapi gratis |
| **OpenRouter Free Tier** | Model gratis rotasi | Kadang model dead, kadang jalan |

Ini penyelamat saat kuota tier 1 & 2 habis mendadak jam 11 malam.

---

## 3. AKTIFKAN RTK TOKEN SAVER

Di dashboard, tab **Optimization**:

- Toggle **RTK Token Saver** → ON (default sudah ON, verifikasi)
- **Cache TTL** → 24 jam untuk kode statis, 1 jam untuk aktivitas coding
- **Prompt caching** → ON kalau tier 1 mendukung (Claude & OpenAI mendukung)

RTK Token Saver bisa memotong 20–40% konsumsi token dengan menghapus
duplikasi konteks. Untuk sesi coding panjang, ini menghemat signifikan.

---

## 4. BUAT COMBO FALLBACK

Di dashboard, tab **Combos** → **New Combo**:

Nama combo: **`skillage-coding`**

Aturan fallback (dari atas ke bawah):

```
1. Tier 1: Claude Opus / Sonnet  (sampai kuota harian tersisa <10%)
2. Tier 2: GLM-4.6                (untuk task rutin, bila prompt < 4k token)
3. Tier 1 lagi: Claude Sonnet    (fallback bila GLM tidak cukup pintar)
4. Tier 3: Kiro AI                (darurat malam hari)
```

Aturan routing (opsional, kalau 9Router versi terbaru sudah mendukung):

- **Task berat** (yang menyebut "database", "migration", "service", "test"):
  paksa Tier 1.
- **Task ringan** (yang menyebut "rename", "format", "typo", "tambah kolom"):
  Tier 2 dulu.
- **Task interaktif chat** (yang mengandung "tolong jelaskan", "bagaimana"):
  Tier 2 cukup, hemat Tier 1 untuk implementasi.

---

## 5. ARAHKAN OPENCODE / CLAUDE CODE KE 9ROUTER

### Untuk OpenCode

Edit `~/.opencode/config.json` (di Windows: `C:\Users\<user>\.opencode\config.json`):

```json
{
  "provider": {
    "custom": {
      "baseURL": "http://localhost:20128/v1",
      "apiKey": "<paste-api-key-dari-9router-dashboard>"
    }
  },
  "default": {
    "provider": "custom",
    "model": "skillage-coding"
  }
}
```

Restart OpenCode. Cek dashboard 9router — request pertama muncul.

### Untuk Claude Code

Claude Code tidak mendukung custom endpoint langsung. Solusinya:

- Pakai Claude Code untuk sesi ringan (chat, brainstorm) — tidak lewat 9router.
- Pakai OpenCode untuk sesi berat (implementasi kode) — lewat 9router untuk
  hemat kuota.

Atau gunakan sesi Claude Code yang tersedia di prompt lain (via desktop app)
untuk grilling dan review, dan OpenCode untuk eksekusi implementasi.

---

## 6. SIMPAN KONFIGURASI

9Router menyimpan konfigurasi di file lokal. Ekspor:

- Dashboard → **Settings** → **Export Config** → simpan sebagai
  `9router-config.json` di root proyek Skillage Mart.

**PENTING:** API key ter-embed di file ini. Jangan commit apa adanya.

Buat versi yang aman untuk repo:

```powershell
# Salin ke versi contoh, hapus API key
Copy-Item 9router-config.json 9router-config.example.json
notepad 9router-config.example.json
# Ganti semua field "apiKey" jadi "REDACTED", simpan
```

Yang di-commit ke Git: `9router-config.example.json`.
Yang aktif (dengan key asli): `9router-config.json` — sudah masuk `.gitignore`
di pre-00. Verifikasi lagi:

```powershell
git check-ignore 9router-config.json
# Harus keluar path, artinya di-ignore
```

---

## 7. PANTAU DASHBOARD

Selama sesi coding berlangsung:

- Buka **Dashboard** di tab browser terpisah. Refresh berkala.
- Perhatikan **Token Usage** per tier. Bila tier 1 mendekati 80%, mulai
  siapkan pindah ke tier 2 untuk task ringan.
- Perhatikan **Error rate** per provider. Kalau spike, mungkin API down —
  fallback otomatis akan handle, tapi bagus untuk diketahui.
- Perhatikan **Latency**. Kalau tier 1 lambat (>10 detik/request), pindah
  sementara ke tier 2.

---

## 8. STRATEGI HEMAT KUOTA UNTUK SESI PANJANG

Untuk POS ini yang butuh ~100+ tiket:

- **Satu tiket satu sesi.** Jangan sambung 5 tiket dalam sesi context 200k
  token — token duplikat akan menumpuk.
- **`/compact` setiap 30–45 menit.** Ringkas konteks agar sisa tiket
  bisa tetap dikerjakan.
- **Batch tiket sejenis di hari yang sama.** Contoh: semua tiket "migration"
  di satu hari, semua "service" di hari lain. Konteks tersimpan lebih efisien.
- **Simpan snapshot progres di file.** Setelah tiap tiket, tulis 3 baris
  ringkas: apa yang dibuat, apa yang di-skip, apa yang perlu di-review lagi.
  Ini nanti dipakai sebagai konteks kompak untuk sesi berikutnya.

---

## 9. UJI SANITY 9ROUTER

Sebelum lanjut ke pre-05, uji dengan permintaan kecil:

- Di OpenCode: minta ia buat file kosong `test-9router.txt` isinya "hello".
- Cek dashboard 9router: request terhitung, tier 1 dipakai.
- Set model default ke tier 2 sementara: minta hal yang sama, cek tier 2
  dipakai.
- Kembalikan ke tier 1 (atau combo).

Bila semua sukses, hapus file `test-9router.txt`.

---

## CHECKLIST VERIFIKASI

- [ ] `npm install -g 9router` sukses, `9router --version` menampilkan angka
- [ ] Proses `9router` berjalan di terminal, dashboard bisa dibuka di
      http://localhost:20128
- [ ] Minimal **3 provider** ter-connect (1 tier 1, 1 tier 2, 1 tier 3)
- [ ] RTK Token Saver aktif
- [ ] Combo `skillage-coding` sudah dibuat dengan minimal 3 langkah fallback
- [ ] OpenCode (atau tool sejenis) sudah diarahkan ke endpoint
      `http://localhost:20128/v1`
- [ ] `9router-config.example.json` di-commit ke repo
- [ ] `9router-config.json` (dengan API key asli) tidak ter-track Git
- [ ] Uji sanity berhasil, request muncul di dashboard, fallback bekerja
- [ ] Ziyad tahu di mana melihat sisa kuota tier 1 setiap saat

---

**Setelah selesai → lanjut ke `pre-05-peta-shadcn.md`.**
