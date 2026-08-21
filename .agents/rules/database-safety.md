# ATURAN KETAT OPERASI DATABASE & SEEDING

1. **DILARANG KERAS MIGRATE:FRESH / WIPE (STRICTLY PROHIBITED)**:
   - DILARANG KERAS menjalankan `php artisan migrate:fresh`, `php artisan db:wipe`, atau `php artisan migrate:reset` pada database aktif (`db-smart`).
   - Perintah ini HANYA BOLEH dieksekusi apabila USER secara eksplisit menyuruh perintah tersebut di chat.

2. **MIGRASI INCREMENTAL ONLY**:
   - Jika terdapat penambahan fitur atau tabel baru, HANYA gunakan `php artisan migrate` biasa tanpa parameter destructive.

3. **SEEDING WAJIB IDEMPOTEN & AMAN (APPEND ONLY)**:
   - Setiap seeder atau skrip pengisian data WAJIB menggunakan metode aman (seperti `firstOrCreate`, `where()->exists()`, atau `insertOrIgnore`).
   - DILARANG menghapus, mereset, atau menimpa baris data lama yang sudah ada di database.

4. **PENGUJIAN & RUNNER TESTING**:
   - Dilarang menjalankan test runner yang menggunakan trait `RefreshDatabase` pada koneksi database utama.
