# WORKSPACE RULES & BEHAVIOR CONSTRAINTS

## 🔴 STRICT DATABASE SAFETY & MIGRATION CONTROL (MUTLAK 1000% DILARANG BYPASS)
1. **HARAM & DILARANG KERAS `db:seed`, `migrate:fresh`, `db:wipe`, `migrate:reset`, ATAU `RefreshDatabase`:**
   - **DILARANG KERAS MENGJALANKAN SEED ATAU RESET**: `php artisan db:seed`, `php artisan migrate:fresh`, `php artisan db:wipe`, `php artisan migrate:reset`, maupun menjalankan test yang menggunakan `RefreshDatabase` pada database server/koneksi aktif (`db-smart`).
   - Eksekusi seeder atau reset database **HANYA BOLEH** jika pengguna (USER) menulis instruksi perintah yang sangat eksplisit.
2. **OPERASI DATABASE HANYA READ-ONLY / INCREMENTAL MIGRATION AMAN:**
   - Jika ada perubahan skema tabel baru, HANYA boleh menjalankan `php artisan migrate` standar (incremental).
3. **PENGUJIAN / TESTING:**
   - Testing WAJIB menggunakan mock atau transaksi rollback (`DatabaseTransactions`), DILARANG KERAS menggunakan `RefreshDatabase` atau seeder otomatis pada database utama.

## 🔴 MANDATORY PACKAGE MANAGER: WAJIB GUNAKAN `pnpm` (MUTLAK)
- **WAJIB MENGGUNAKAN `pnpm`**: Seluruh perintah package manager dan eksekusi frontend WAJIB menggunakan `pnpm` (`pnpm install`, `pnpm build`, `pnpm run build`, `pnpm run dev`, `pnpm add ...`, `pnpm dlx ...`).
- **DILARANG MENGGUNAKAN `npm` ATAU `yarn`**.

## ⚡ LARAVEL PERFORMANCE OPTIMIZATION RULES (10 ATURAN WAJIB)
1. **Rule #1 — Cache Route**: Jalankan `php artisan route:cache`. Pastikan tidak ada Closure di route definitions.
2. **Rule #2 — Cache Config**: Jalankan `php artisan config:cache`. Jangan gunakan `env()` di luar `config/*.php`.
3. **Rule #3 — Optimalkan Autoloader Composer**: Jalankan `composer install --optimize-autoloader --no-dev`.
4. **Rule #4 — Eager Loading (Cegah N+1 Query)**: Selalu gunakan `with()`, `load()`, atau `withCount()`. Dilarang memanggil relasi Eloquent di dalam foreach loop atau view.
5. **Rule #5 — Gunakan Queue untuk Proses Berat**: Pindahkan logic berat (kirim email, generate report/PDF, resize gambar, panggil API eksternal) ke Job queue.
6. **Rule #6 — Cache Hasil Query**: Gunakan `Cache::remember()` untuk data yang sering diakses namun jarang berubah.
7. **Rule #7 — Database Indexing**: Kolom pada `WHERE`, `JOIN`, dan `ORDER BY` wajib memiliki indeks pada migration/tabel.
8. **Rule #8 — Kompres & Minify Asset**: Jalankan `pnpm build` untuk memproduksi asset ter-minify.
9. **Rule #9 — Aktifkan OPcache**: Pastikan ekstensi OPcache aktif pada server production.
10. **Rule #10 — Driver Cache & Session Cepat**: Gunakan Redis (atau Memcached) untuk cache dan session driver, bukan file atau database.

## 🔴 STRICT GIT PUSH PERMISSION CONTROL & DUAL REMOTE REQUIREMENT
- **Git Commit**: Boleh (diizinkan) melakukan `git commit` di lokal untuk menyimpan checkpoint pekerjaan.
- **Git Push**: **DILARANG KERAS** me-push kode secara otomatis tanpa instruksi USER.
- **DUAL REMOTE PUSH (MUTLAK UNTUK PROYEK S-MART)**: Apabila USER memberikan instruksi/perintah push (mis. "push", "push ke main"), AGEN **WAJIB PUSH KE 2 REMOTE SEKALIGUS**:
  1. `git push origin main` (`https://github.com/zynly/s-mart.git`)
  2. `git push velora main` (`https://github.com/velora-1d/POS-Skillage.git`)
