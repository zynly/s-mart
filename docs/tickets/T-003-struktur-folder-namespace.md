# T-003 — Struktur Folder Backend & Frontend + 5 Layout

**Fase induk:** Fase 0 (Fondasi Proyek)
**Status:** ✅ Selesai (2026-07-30)
**Estimasi:** S (≤2 jam) — realisasi ~2 jam

## Deskripsi

Membuat kerangka folder backend (`app/Enums`, `app/Data`,
`Http/Controllers/{Admin,Pos,Public,Wali}`, dst) dan frontend
(`resources/js/Pages/*`, `Layouts`, `Components/{common,forms,charts}`,
`Hooks`, `Lib/schemas`, `Store`, `Types`), serta 5 layout React untuk
setiap area aplikasi.

## Kriteria Penerimaan

- [x] Seluruh folder di `fase-00-v2.md` § 9 ada (backend & frontend)
- [x] `GuestLayout.tsx` — center card, gradien navy, footer nama sekolah
- [x] `AdminLayout.tsx` — sidebar 260px navy-800 (collapsible), header
      navy-600, drawer Sheet di <1024px
- [x] `PosLayout.tsx` — fullscreen, header tipis, body 100vh tanpa scroll
- [x] `PublicLayout.tsx` — mobile-first, nav + tombol Portal Wali, footer
      kontak sekolah, max-width 1200px
- [x] `WaliLayout.tsx` — mobile-first, bottom nav 4 item
- [x] `routes/admin.php` dan `routes/pos.php` didaftarkan di
      `bootstrap/app.php` via `then:` closure

## Blocking Edges

- T-001 harus sudah selesai.

## Referensi

- `fase-00-v2.md` § 9, 13
- `README-v2.md` § Struktur Folder

## Catatan Implementasi

- `routes/admin.php`/`pos.php` didaftarkan lewat closure `then:` di
  `withRouting()` — bukan file terpisah yang otomatis ter-load seperti
  `web.php`, jadi butuh `Route::middleware('web')->group(base_path(...))`
  eksplisit.
- Sidebar `AdminLayout` di Fase 0 sengaja skeleton (satu link "Uji
  Komponen" saja) — menu lengkap & permission filtering ditunda ke Fase
  UI-01 (T-116), jangan hardcode menu bisnis di sini.
