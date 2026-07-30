# T-045 — `CashierSessionService` (Buka/Tutup Sesi, Expected Cash, Cek Hold)

**Fase induk:** Fase 7 (Sesi Kasir & Kas)
**Estimasi:** L (≤8 jam)

## Deskripsi

Service inti pengelolaan sesi kasir — dari buka laci sampai tutup laci.
Blok utama untuk Fase 8 (Layar Kasir): kasir tidak bisa bertransaksi
tanpa sesi aktif.

## Kriteria Penerimaan

- [ ] `open(User, CashAccount, int $openingCash): CashierSession` — satu
      user hanya boleh punya **satu** sesi terbuka pada satu waktu
- [ ] `getActive(User): ?CashierSession`
- [ ] `calculateExpected(CashierSession): int` memakai rumus (lihat
      catatan implementasi — **bukan** rumus mentah dokumen asli)
- [ ] `close(CashierSession, int $actualCash, ?string $reason, ?User
      $approver)`: **menolak** tutup bila masih ada `SaleHold` aktif
      (lempar `SessionCannotCloseWithHoldsException`, diaktifkan
      penuh di Fase 8/T-052)
- [ ] Selisih (`actual_cash - expected_cash`) melebihi batas
      (`config('pos.opname_tolerance_percent')` — atau ambang kas
      terpisah bila didefinisikan) → wajib `reason` + `approver` (PIN
      supervisor)
- [ ] Sesi berstatus `closed`/`force_closed` **tidak bisa** dibuka
      kembali — tidak ada method `reopen()`
- [ ] `forceClose(CashierSession)` untuk dipakai command `session:auto-close`
      (T-047) — `actual_cash = expected_cash`, status `force_closed`
- [ ] `handover(CashierSession $from, User $to): CashierSession` — serah
      terima shift dalam laci yang sama
- [ ] `CashService::recordIn/recordOut/transfer/dropCash/depositToBank`
      — semua update `current_balance` dengan `lockForUpdate()`; saldo
      kas tidak boleh minus (pengeluaran melebihi saldo ditolak)
- [ ] Penjualan deposit dan non-tunai **tidak masuk** hitungan
      `expected_cash`

## Blocking Edges

- T-043 dan T-044 (migration `cashier_sessions`, `cash_transactions`)
  harus sudah selesai.

## Referensi

- CONTEXT.md § Transaksi (Sesi Kasir, Modal Awal, Expected Cash,
  Selisih Kas, Drop Cash)
- SPEC.md § 4 poin 13
- `PROMPT-POS-SKILLAGE-MART.md` § Fase 7, bagian 2–4
- `CATATAN-PERBAIKAN.md` § Fase 7

## Catatan Implementasi

- **Rumus `expected_cash` di dokumen asli sudah usang** — memakai satu
  kolom `total_receivable_payment` seolah pelunasan piutang selalu
  tunai. Padahal wali/anggota bisa melunasi piutang via transfer.
  Rumus final (per `CATATAN-PERBAIKAN.md`, kolom dipecah di T-043
  menjadi `total_receivable_cash` dan `total_receivable_noncash`):

  ```
  expected_cash = opening_cash
                + total_sales_cash
                + total_topup_cash
                + total_receivable_cash        ← HANYA yang tunai
                + total_cash_in
                − total_cash_out
                − total_drop
                − total_refund_cash
  ```

- Verifikasi top-up transfer oleh admin/treasurer **tidak** memerlukan
  sesi kasir aktif (uang masuk ke rekening bank, bukan laci) — jangan
  syaratkan `getActive()` di alur verifikasi top-up (T-098).
- Kolom sesi (`total_sales_cash`, `total_topup_cash`, dst) **diisi dari
  luar** service ini — lewat method `addSaleCash()` dst yang dipanggil
  `SaleService::complete()` (T-051), `DepositService::topup()` (T-026),
  `ReceivableService::pay()` (T-060). `CashierSessionService` sendiri
  tidak tahu detail transaksi bisnis, hanya mengakumulasi angkanya.
