---
trigger: always_on
description: Aturan Ketat Git Operations - Boleh Commit Lokal, Dilarang Auto Push Tanpa Konfirmasi Eksplisit
---

# ATURAN KETAT OPERASI GIT

1. **GIT COMMIT (DIALLOWED)**:
   - Boleh dan diizinkan melakukan `git commit` pada repositori lokal untuk menyimpan progres perbaikan/fitur secara berkala.

2. **GIT PUSH (STRICTLY RESTRICTED & DUAL REMOTE REQUIREMENT)**:
   - **DILARANG KERAS** menjalankan perintah `git push` secara otomatis tanpa konfirmasi pengguna.
   - `git push` HANYA BOLEH dieksekusi apabila pengguna (USER) secara eksplisit memberikan perintah push (misalnya: "push", "push ke main").
   - **WAJIB SEKALIGUS KE 2 REMOTE**: Ketika melakukan push, WAJIB mengeksekusi kedua remote sekaligus:
     1. `git push origin main` (`https://github.com/zynly/s-mart.git`)
     2. `git push velora main` (`https://github.com/velora-1d/POS-Skillage.git`)
