# T-080 — `JournalService` (Validasi Debit=Kredit, Exception Bila Timpang)

**Fase induk:** Fase 13 (Akuntansi: COA, Jurnal & Buku Besar)
**Estimasi:** L (≤8 jam)

## Deskripsi

Service inti akuntansi double-entry. Setiap transaksi keuangan/stok
bermuara ke sini lewat Observer otomatis (T-081) — jantung dari seluruh
laporan keuangan di Fase 14.

## Kriteria Penerimaan

- [ ] `record(string $type, array $entries, Model $source, ?Carbon
      $date): Journal` — validasi **total debit = total kredit**; bila
      tidak, lempar exception (tidak boleh tersimpan sebagian)
- [ ] `reverse(Journal, string $reason): Journal` — jurnal pembalik
      (dipakai oleh void, T-070)
- [ ] `getLedger(Account, Carbon $from, Carbon $to): Collection` — buku
      besar per akun
- [ ] `getTrialBalance(Carbon $asOf): Collection` — neraca saldo, total
      debit-kredit harus seimbang
- [ ] `getProfitLoss(Carbon $from, Carbon $to): array` dan
      `getBalanceSheet(Carbon $asOf): array`
- [ ] `closePeriod(int $year, int $month, User $owner): void` — jurnal
      penutup (pendapatan & beban → Ikhtisar Laba Rugi → Laba Ditahan),
      periode terkunci setelahnya
- [ ] Peta jurnal konsinyasi mengikuti **model murni** (ADR-0006): tidak
      ada jurnal saat terima, hanya jurnal saat jual (kas + utang
      konsinyasi, lalu akui komisi) dan settlement
- [ ] Test: jurnal tidak seimbang melempar exception dan tidak
      tersimpan sama sekali (bukan tersimpan lalu ditandai invalid)

## Blocking Edges

- T-078 (migration `chart_of_accounts`, `journal_entries`,
  `journal_lines`) dan T-079 (seeder COA) harus sudah selesai.

## Referensi

- ADR-0003: Deposit sebagai kewajiban akun
- ADR-0006: Konsinyasi model murni
- CONTEXT.md § Akuntansi
- SPEC.md § 4 poin 19
- `PROMPT-POS-SKILLAGE-MART.md` § Fase 13, bagian 4

## Catatan Implementasi

- **Wajib pakai Observer/Event Listener** pada model `Sale`,
  `Purchase`, `DepositTransaction`, `CashTransaction`, dll — jurnal
  terbit **otomatis**, jangan mengandalkan pemanggilan manual
  `JournalService::record()` tersebar di berbagai service (aturan tegas
  dari `CATATAN-PERBAIKAN.md` § Fase 13 & § Perbaikan Lintas-Fase).
- Peta jurnal konsinyasi di dokumen asli **salah** — jangan disalin apa
  adanya. Yang benar (ADR-0006): terima konsinyasi = **tidak ada jurnal
  sama sekali** (bukan "D Persediaan Konsinyasi / K Utang Konsinyasi"
  seperti model beli-saat-terjual). Jual konsinyasi mengakui **utang
  konsinyasi penuh dulu**, baru memotong sebagian sebagai pendapatan
  komisi — bukan mengakui "Penjualan" penuh milik mart.
- `closePeriod()` adalah salah satu dari sedikit operasi yang benar-benar
  irreversible dalam sistem ini (selain hard-delete yang memang
  dilarang) — pastikan ada konfirmasi berlapis di halaman (T-104 pola
  konfirmasi bahaya: ketik nama toko + password owner).
