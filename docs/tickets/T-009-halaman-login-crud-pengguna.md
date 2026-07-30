# T-009 — Halaman Login + CRUD Pengguna (React Pages, Fortify)

**Fase induk:** Fase 1 (Autentikasi, Role & Pengguna)
**Estimasi:** L (≤8 jam)

## Deskripsi

Halaman-halaman auth (login, lupa password, profil) dan manajemen
pengguna (CRUD, kelola role, log aktivitas) — semua React page Inertia
di atas Laravel Fortify (sudah ter-install T-001).

## Kriteria Penerimaan

- [ ] Halaman Login (`GuestLayout`, username + password, desain navy +
      logo sekolah) — terhubung ke Fortify `AuthenticatedSessionController`
- [ ] Halaman Lupa Password (via email admin, bukan self-service publik
      — sesuai konteks sekolah tertutup)
- [ ] Halaman Profil: ubah nama, foto, password, PIN
- [ ] CRUD Pengguna (`AdminLayout` + `DataTable`): daftar dengan
      search/filter role & outlet, tambah, edit, aktif/nonaktif, reset
      password, atur PIN
- [ ] Kelola Role: daftar role, matriks permission (grid checkbox
      modul × aksi menggunakan shadcn `Checkbox` + `Table`), buat role
      kustom
- [ ] Log Aktivitas: `DataTable` menampilkan activity log, filter
      user/tanggal/modul, tampilkan perubahan before-after
      (`properties` dari `spatie/laravel-activitylog`)
- [ ] Semua form pakai `react-hook-form` + `zod` (aturan kode #17)
- [ ] Halaman "Pengaturan" (T-103, Fase 17) nantinya menautkan ke
      halaman-halaman ini via tab, bukan menu sidebar terpisah — sudah
      disiapkan strukturnya di sini

## Blocking Edges

- T-006 dan T-007 harus sudah selesai.

## Referensi

- CONTEXT.md § Aktor
- `PROMPT-POS-SKILLAGE-MART.md` § Fase 1, bagian 5
- `PETA-KOMPONEN.md` § 4 (halaman 9, 44, 45)

## Catatan Implementasi

- Reuse `DataTable` (Fase 0) untuk semua tabel di sini — jangan bikin
  tabel custom baru. Matriks permission grid **bukan** kasus untuk
  `DataTable` (bukan tabel data biasa, tapi grid checkbox interaktif) —
  komponen custom baru boleh untuk kasus ini spesifik.
- Reset password oleh admin **berbeda** dari self-service "lupa
  password" — admin bisa langsung set password baru tanpa email,
  self-service tetap lewat email.
