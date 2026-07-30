# T-056 — `PaymentService::canUseCredit()` + Split Payment

**Fase induk:** Fase 9 (Pembayaran Multi-Metode)
**Estimasi:** L (≤8 jam)

## Deskripsi

Service pemrosesan pembayaran multi-metode dengan pola `PaymentHandler`
per metode (Cash, Deposit, Card, Qris, Voucher, Point, Credit, Payroll),
termasuk split payment satu nota banyak metode dan pengecekan limit
kredit anggota.

## Kriteria Penerimaan

- [ ] `process(Sale, array $payments): Collection` — validasi total
      seluruh pembayaran = `grand_total`, panggil handler per metode
- [ ] Interface `PaymentHandler` dengan 8 implementasi: `CashHandler`
      (hitung kembalian, **satu-satunya** yang boleh ada kembalian),
      `DepositHandler` (PIN wajib kecuali di bawah
      `config('pos.no_pin_threshold')`), `CardHandler` (wajib nomor
      approval, MDR dipotong), `QrisHandler` (wajib ref, status
      pending→settled H+1), `VoucherHandler` (tanpa kembalian, sisa
      hangus), `PointHandler` (konversi via `point_value`),
      `CreditHandler`, `PayrollHandler` (khusus fasilitator/staf)
- [ ] `canUseCredit(Member $member, int $amount): array` — jumlahkan
      `Receivable` aktif (`unpaid`/`partial`/`overdue`), tolak
      (`allowed: false, reason: over_limit`) bila total baru >
      `member->receivable_limit`, kecuali ada override supervisor
- [ ] Split payment: total semua metode harus persis sama dengan
      `grand_total`; urutan default optimasi Voucher → Poin → Saldo →
      Tunai (uang fisik dipakai paling akhir)
- [ ] `refund(SalePayment, int $amount)`: **selalu** mengembalikan sesuai
      metode asal — bayar saldo → refund ke saldo, tidak bisa
      dikonversi ke tunai (ADR-0003)
- [ ] MDR: `net_amount = amount − (amount × mdr_percent)`, jurnal
      `D Bank + D Beban MDR / K Penjualan`

## Blocking Edges

- T-051 (`SaleService::complete()`) harus punya titik integrasi siap;
  T-026 (`DepositService`) dan T-019 (migration `members` dengan
  `receivable_limit`) harus sudah selesai.

## Referensi

- ADR-0005: Sistem Kredit Anggota via `receivable_limit`
- CONTEXT.md § Kredit Anggota
- SPEC.md § 4 poin 4, 17
- `PROMPT-POS-SKILLAGE-MART.md` § Fase 9, bagian 2–5
- `CATATAN-PERBAIKAN.md` § Fase 9

## Catatan Implementasi

- `canUseCredit()` **tidak ada** di pseudocode dokumen asli (yang masih
  memakai `allow_negative`) — implementasi konkret wajib mengikuti
  `CATATAN-PERBAIKAN.md` § Fase 9, bukan tabel "Metode Pembayaran" di
  dokumen asli yang menyebut generik "cek limit kredit anggota" saja.
- `DepositHandler` wajib cek: kartu aktif, tidak suspended, saldo
  cukup, limit harian/mingguan, jam & hari belanja, kategori terblokir
  (`blocked_categories` — lihat T-024 untuk cleanup-nya). Bebas PIN di
  bawah `no_pin_threshold`; bila santri belum punya PIN, alihkan ke alur
  buat PIN dulu (bukan tolak transaksi begitu saja).
- Refund non-tunai wajib untuk retur pasca-tutup-sesi (ADR-0007) —
  `refund()` di sini dipakai juga oleh `SaleReturnService` (T-069), jadi
  pastikan tidak ada jalur pintas yang mengizinkan konversi ke tunai.
