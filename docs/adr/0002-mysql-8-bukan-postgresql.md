# ADR-0002: MySQL 8, bukan PostgreSQL

**Status:** Diterima
**Tanggal:** 2026-07-30
**Konteks:** Target deploy adalah shared hosting Hostinger (lihat
ADR-0008), yang secara umum menyediakan MySQL/MariaDB sebagai database
utama, bukan PostgreSQL.

## Keputusan

Menggunakan **MySQL 8** (utf8mb4/utf8mb4_unicode_ci) sebagai satu-satunya
database, baik untuk development (Laragon lokal) maupun produksi.

## Alternatif yang Dipertimbangkan

1. **PostgreSQL** — fitur lebih kaya (JSON lebih matang, window function
   lebih awal tersedia), tapi jarang tersedia sebagai pilihan default di
   shared hosting Indonesia/Hostinger tanpa upgrade paket khusus.
2. **SQLite** — cukup untuk development cepat, tidak cocok untuk beban
   konkuren kasir + storefront + portal wali secara bersamaan.

## Konsekuensi

- Query FEFO (`ORDER BY (expired_at IS NULL), expired_at ASC, received_at
  ASC`) memakai idiom MySQL, bukan `NULLS LAST` gaya PostgreSQL.
- `DB::transaction()` + `lockForUpdate()` mengandalkan row-level locking
  InnoDB — pastikan seluruh tabel transaksi memakai storage engine InnoDB
  (default Laravel migration).
- JSON column (mis. `blocked_categories`) memakai fungsi JSON MySQL 8
  (`whereJsonContains`, dst).

## Tanggal Peninjauan Ulang

Saat migrasi ke VPS (lihat ADR-0008) — PostgreSQL bisa dipertimbangkan
ulang bila kebutuhan analitik/reporting bertambah kompleks.
