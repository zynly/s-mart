---
trigger: always_on
description: Aturan Ketat Git Operations - Boleh Commit Lokal, Dilarang Auto Push Tanpa Konfirmasi Eksplisit
---

# ATURAN KETAT OPERASI GIT

1. **GIT COMMIT (DIALLOWED)**:
   - Boleh dan diizinkan melakukan `git commit` pada repositori lokal untuk menyimpan progres perbaikan/fitur secara berkala.

2. **GIT PUSH (STRICTLY RESTRICTED)**:
   - **DILARANG KERAS** menjalankan perintah `git push` ke remote repository (origin/main) secara otomatis.
   - `git push` HANYA BOLEH dieksekusi apabila pengguna (USER) secara eksplisit memberikan perintah atau konfirmasi untuk push (misalnya: "push", "push ke main", "push repositori").
