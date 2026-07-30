# ADR-0003: Deposit sebagai kewajiban akun, bukan pendapatan

**Status:** Diterima
**Tanggal:** 2026-07-30
**Konteks:** Santri menitipkan uang ke mart dalam bentuk saldo deposit,
dipakai untuk belanja lewat kartu barcode. Perlakuan akuntansi salah
kaprah yang umum: mencatat top-up sebagai pendapatan saat masuk.

## Keputusan

Saldo deposit dicatat sebagai **kewajiban** mart (akun **2-1200 "Utang
Deposit Anggota"**), bukan pendapatan. Setiap top-up: kredit 2-1200
bertambah. Setiap belanja pakai saldo: debit 2-1200 berkurang, penjualan
tercatat terpisah di akun pendapatan penjualan.

Saldo dihitung dari **`SUM(amount)` tabel `deposit_transactions`**
(ledger append-only), bukan kolom `balance` yang di-update langsung.
`members.balance_cache` hanya cache performa, wajib direkonsiliasi
harian (`php artisan deposit:reconcile`).

## Alternatif yang Dipertimbangkan

1. **Deposit sebagai pendapatan saat top-up** — salah secara akuntansi:
   uang itu belum "dihasilkan" mart, masih titipan yang bisa ditarik
   (dengan approval) atau di-refund.
2. **Kolom `balance` tunggal di-update langsung** — rawan race condition
   saat dua kasir melayani santri sama bersamaan, dan tidak ada audit
   trail granular per mutasi.

## Konsekuensi

- Semua mutasi saldo **wajib** lewat `DepositService::record()` dengan
  `lockForUpdate()` + `idempotency_key` (wajib, bukan opsional — lihat
  konteks online di `CATATAN-PERBAIKAN.md` Fase 4).
- Refund retur **mengikuti metode bayar asal** — bayar saldo → refund ke
  saldo, tidak bisa dikonversi ke tunai (mencegah celah pencucian saldo
  lewat top-up transfer → belanja → retur tunai).
- Withdrawal (tarik tunai) butuh approval eksplisit, berbeda dari refund.
- Laporan neraca menampilkan total saldo deposit beredar sebagai
  kewajiban lancar, bukan bagian dari laba.

## Tanggal Peninjauan Ulang

Saat Fase 13 (Akuntansi) diimplementasikan — pastikan Observer jurnal
otomatis konsisten dengan keputusan ini, jangan mengandalkan pemanggilan
manual di service.
