# T-026 — `DepositService::record()` dengan `lockForUpdate()` + `idempotency_key` Wajib

**Fase induk:** Fase 4 (Deposit & Saldo)
**Estimasi:** L (≤8 jam)

## Deskripsi

Service inti untuk semua mutasi saldo deposit santri. Satu-satunya jalur
resmi untuk mengubah `balance_cache` — tidak ada kode lain yang boleh
meng-update kolom itu langsung. Mencegah double-spend saat dua kasir
melayani santri yang sama secara bersamaan.

## Kriteria Penerimaan

- [ ] `DepositService::record(Member, DepositType, int $amount, ?Model
      $source, array $meta)` mengembalikan `DepositTransaction`
- [ ] `Member::lockForUpdate()` dipanggil di dalam `DB::transaction()`
      sebelum baca `balance_cache`
- [ ] Bila `$meta['idempotency_key']` sudah pernah dipakai, kembalikan
      transaksi yang sudah ada (bukan buat baru) — **tanpa exception**
- [ ] Bila `idempotency_key` **tidak diberikan sama sekali**, lempar
      `MissingIdempotencyKeyException` (wajib untuk semua caller — lihat
      catatan implementasi, ini penguatan dari rencana asli)
- [ ] Bila `balance_after < 0`, lempar `InsufficientBalanceException` —
      **tanpa** pengecualian `allow_negative` (field itu sudah dibuang,
      lihat ADR-0005)
- [ ] Method turunan tersedia: `topup()`, `charge()`, `refund()`,
      `withdraw()` (butuh approver), `adjust()` (wajib alasan, hanya
      owner), `bonus()`, `transferCard()` (ganti kartu, dua baris
      berpasangan `card_transfer_out`/`in` dengan `idempotency_key` sama)
- [ ] Tabel `deposit_transactions` bersifat **append-only** — tidak ada
      `update()`/`delete()` di service manapun terhadap baris yang sudah
      ada
- [ ] Index `(member_id, created_at)`, `(outlet_id, created_at)`, `type`
      ada di migration

## Blocking Edges

- T-019 (migration `members`) harus sudah selesai.
- T-025 (migration `deposit_transactions`) harus sudah selesai.

## Referensi

- ADR-0003: Deposit sebagai kewajiban akun, bukan pendapatan
- ADR-0005: Sistem Kredit Anggota, bukan `allow_negative`
- CONTEXT.md § Uang & Saldo
- SPEC.md § 4 poin 1–5, 17
- `PROMPT-POS-SKILLAGE-MART.md` § Fase 4, bagian 2
- `CATATAN-PERBAIKAN.md` § Fase 4

## Catatan Implementasi

- **Pseudocode di dokumen asli Fase 4 sudah usang** — masih
  mereferensikan `$member->allow_negative` dan `$member->credit_limit`
  dalam pengecekan saldo minus. Kedua field itu **sudah dibuang** dari
  tabel `members` (ADR-0005, dieksekusi di T-019). Implementasi final:
  saldo deposit **tidak pernah** boleh negatif sama sekali — belanja di
  atas saldo tidak memakai jalur `DepositService`, melainkan beralih ke
  metode bayar **Kredit** terpisah (`PaymentService::canUseCredit()`,
  T-056) yang menerbitkan `Receivable`, dibatasi `receivable_limit`.
  Jangan salin pseudocode lama itu apa adanya.
- `idempotency_key` di rencana asli hanya opsional — **diperkuat wajib**
  karena konteks online (portal wali, kemungkinan double-submit lebih
  tinggi: klik dobel, retry jaringan). Lempar exception eksplisit bila
  kosong, jangan diam-diam menerima `null`.
- `transferCard()` (ganti kartu) rename dari asumsi asli `transfer_in`/
  `transfer_out` generik menjadi `card_transfer_in`/`card_transfer_out`
  spesifik (lihat `CATATAN-PERBAIKAN.md` § Fase 4) — dua baris ledger
  berpasangan, jumlah net nol, `idempotency_key` sama untuk keduanya.
