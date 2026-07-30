# T-001 — Instalasi Laravel 12 + Inertia + React + TypeScript

**Fase induk:** Fase 0 (Fondasi Proyek)
**Status:** ✅ Selesai (2026-07-30)
**Estimasi:** M (≤4 jam) — realisasi ~3 jam termasuk penyesuaian versi

## Deskripsi

Instalasi kerangka aplikasi Laravel 12 di folder `s-mart` (bukan folder
kosong — sudah berisi `docs/` dan `prompts/` dari tahap pre-coding),
dengan Inertia.js v2, React 18/19, dan TypeScript strict mode. Database
MySQL `s_mart_dev` dibuat, virtual host `s-mart.test` dikonfigurasi.

## Kriteria Penerimaan

- [x] `php artisan --version` menampilkan Laravel 12.x
- [x] `.env` terisi: `APP_NAME`, `DB_DATABASE=s_mart_dev`, `APP_URL=http://s-mart.test`
- [x] `docs/` dan `prompts/` tetap utuh setelah instalasi
- [x] `composer require inertiajs/inertia-laravel tightenco/ziggy` sukses
- [x] `HandleInertiaRequests` middleware terdaftar di `bootstrap/app.php`,
      share `auth.user` (dengan roles/permissions), `flash`, `ziggy`, `appName`
- [x] `resources/views/app.blade.php` root Inertia dengan `@inertiaHead`/`@inertia`
- [x] `php artisan migrate` sukses ke MySQL (bukan sqlite default installer)
- [x] Route `/` merender halaman Inertia (`Public/Welcome`) dengan HTTP 200

## Blocking Edges

Tidak ada — tiket entry-point.

## Referensi

- ADR-0001: Inertia + React, menggantikan rencana asli Livewire
- `fase-00-v2.md` § 1–2, 7
- `README-v2.md` § Struktur Folder

## Catatan Implementasi

- Package `tightenco/ziggy` di-namespace-kan **`Tighten\Ziggy`** (bukan
  `Tightenco\Ziggy`) — kesalahan impor namespace ini sempat menyebabkan
  500 error "Class Tightenco\Ziggy\Ziggy not found" di seluruh route
  Inertia. Selalu `use Tighten\Ziggy\Ziggy;`.
- Laravel 12 fresh install kini sudah menyertakan tabel `sessions`,
  `cache`, `jobs` bawaan di migration skeleton — `php artisan
  session:table`/`cache:table`/`queue:table` akan gagal dengan "Migration
  already exists", itu normal, lewati saja.
- Ekstensi PHP `sodium` sering nonaktif default di php.ini Laragon —
  wajib diaktifkan (`extension=sodium`) untuk `laravel/fortify`.
