# PERSIAPAN SEBELUM NGODING — SKILLAGE MART POS

Dokumen ini adalah **gerbang** yang harus dilewati sebelum menulis satu baris
kode aplikasi POS Skillage Mart. Susunan mengikuti modul workflow Pak Zeydan
(Graphify · Skills · 9Router · shadcn/ui · OpenCode · Browser Use), disesuaikan
dengan konteks proyek pribadi Ziyad: **Laravel 12 + Inertia + React + TypeScript**,
dev lokal di Laragon + VSCode, deploy akhir ke shared hosting.

---

## URUTAN EKSEKUSI

| # | File | Waktu | Wajib? |
|---|---|---|---|
| 0 | `pre-00-setup-environment.md` | 60 menit | Ya |
| 1 | `pre-01-graphify-referensi.md` | 90 menit | Opsional (skip bila dari nol) |
| 2 | `pre-02-grill-requirement.md` | 2–3 jam | Ya |
| 3 | `pre-03-spec-dan-tiket.md` | 90 menit | Ya |
| 4 | `pre-04-setup-9router.md` | 30 menit | Ya |
| 5 | `pre-05-peta-shadcn.md` | 60 menit | Ya |
| 6 | `pre-06-gerbang-siap-ngoding.md` | 15 menit | Ya |

**Total realistis: 1–2 hari kerja penuh** untuk yang wajib, plus 90 menit
tambahan untuk Graphify bila dipakai.

---

## OUTPUT YANG DIHASILKAN

Semua tersimpan di dalam folder proyek `skillage-mart/docs/` kecuali disebut lain:

```
skillage-mart/
├── docs/
│   ├── CATATAN-REFERENSI.md          (dari pre-01, opsional)
│   ├── CONTEXT.md                     (dari pre-02) — kamus domain
│   ├── SPEC.md                        (dari pre-03) — spesifikasi final
│   ├── PETA-KOMPONEN.md               (dari pre-05) — peta shadcn/ui
│   ├── GERBANG-KESIAPAN.md            (dari pre-06) — checklist final
│   ├── adr/                           (dari pre-02) — architectural decisions
│   │   ├── 0001-inertia-vs-api.md
│   │   ├── 0002-database-mysql.md
│   │   └── ...
│   └── tickets/                       (dari pre-03) — backlog kerja
│       ├── T-001-fondasi-proyek.md
│       ├── T-002-auth-role.md
│       └── ...
├── 9router-config.json                (dari pre-04, di luar docs)
└── .env.example                       (dari pre-00)
```

---

## PRINSIP YANG DIPEGANG

1. **Bahasa Indonesia untuk dokumentasi, bahasa Inggris untuk kode.** Kamus domain
   di `CONTEXT.md` menetapkan istilah baku yang dipakai konsisten (contoh:
   *santri* = member, *deposit* = saldo, bukan *balance*).
2. **Setiap keputusan besar dicatat sebagai ADR.** Kalau nanti lupa "kenapa dulu
   pilih ini", ADR yang menjawab. Tidak boleh mengandalkan ingatan.
3. **Tiket kerja kecil, dependency eksplisit.** Satu tiket = satu commit yang bisa
   di-review. Blocking edges jelas supaya tidak keliru urutan.
4. **Peta komponen sebelum kode UI.** Jangan biarkan AI menulis komponen custom
   padahal shadcn/ui sudah menyediakan.
5. **Gerbang kesiapan mutlak.** Kalau checklist di pre-06 belum semua tercentang,
   **jangan mulai ngoding**. Kembali ke tahap yang belum selesai.

---

## SETELAH GERBANG DILEWATI

Baru setelah pre-06 lolos, Ziyad boleh membuka folder `prompts/` (fase 0–18 +
fase-ui-01) dan mulai eksekusi coding via OpenCode / Claude Code, tiket demi
tiket, mengikuti `URUTAN-KERJA.md`.

---

*Skillage Mart POS — SMK Skill Village Islamic School*
