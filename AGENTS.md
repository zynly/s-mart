# WORKSPACE RULES & BEHAVIOR CONSTRAINTS

## 🔴 STRICT DATABASE SAFETY & MIGRATION CONTROL (MUTLAK & DILARANG KERAS DI-BYPASS)
1. **DILARANG KERAS `migrate:fresh`, `db:wipe`, `migrate:reset`, ATAU TEST DENGAN REFRESH DATABASE:**
   - **TIDAK BOLEH** menjalankan `php artisan migrate:fresh`, `php artisan db:wipe`, `php artisan migrate:reset`, atau seeder yang menghapus/menimpa data pada database server/koneksi aktif (`db-smart`).
   - `migrate:fresh` **HANYA BOLEH** dieksekusi jika dan hanya jika pengguna (USER) secara eksplisit menulis perintah "migrate:fresh".
2. **OPERASI DATABASE HANYA BERSIFAT INCREMENTAL & AMAN:**
   - Jika ada perubahan skema tabel baru, HANYA boleh menjalankan `php artisan migrate` standar (incremental).
   - Jika melakukan seeding atau pengisian data, **WAJIB HANYA MENGISI DATA YANG BELUM ADA SAJA** (menggunakan `firstOrCreate`, `insertOrIgnore`, atau pengecekan `exists()` terlebih dahulu). Dilarang keras menimpa/menghapus data lama yang sudah ada.
3. **PENGUJIAN / TESTING:**
   - Testing wajib menggunakan mock atau transaksi rollback (`DatabaseTransactions`), DILARANG menggunakan `RefreshDatabase` pada database utama.

## 🔴 GIT PUSH PERMISSION CONTROL
- **Git Commit**: Boleh (diizinkan) melakukan `git commit` di lokal untuk menyimpan checkpoint pekerjaan.
- **Git Push**: **DILARANG KERAS** me-push kode ke remote (GitHub/GitLab/origin main) secara otomatis. `git push` HANYA boleh dieksekusi jika USER secara eksplisit menyuruh "push".

