# ADR-0007: Retur pasca-tutup-sesi wajib refund non-tunai

**Status:** Diterima
**Tanggal:** 2026-07-30
**Konteks:** Rencana asli Fase 7/11 tidak menjelaskan mekanisme retur
untuk nota yang sesi kasir asalnya sudah ditutup. Void tidak boleh
dilakukan setelah sesi tutup (aturan yang sudah ada), tapi retur perlu
tetap bisa dilakukan — masalahnya, dari mana uang refund diambil bila
laci sesi asal sudah tidak ada?

## Keputusan

Bila sesi kasir asal transaksi **sudah tutup**:
- Void **tidak boleh** (aturan lama, tetap berlaku).
- Retur **boleh** dilakukan, tapi refund **wajib non-tunai** (deposit
  atau transfer) — **tidak boleh** mengambil dari kas laci sesi yang
  sedang berjalan sekarang, karena uang laci itu milik sesi baru, bukan
  sesi lama.

Implementasi: `SaleReturnService::calculateRefundOptions()` mengecek
status sesi asal — bila `closed`, opsi `'cash'` dihilangkan dari daftar
metode refund yang ditawarkan ke kasir.

## Alternatif yang Dipertimbangkan

1. **Larang retur sama sekali setelah sesi tutup** — ditolak: terlalu
   membatasi pelanggan/santri yang ingin retur di hari berikutnya
   (kasus umum: barang cacat ditemukan setelah pulang).
2. **Ambil dari kas laci sesi berjalan** — ditolak: mencemari
   rekonsiliasi `expected_cash` sesi yang sedang berjalan dengan
   transaksi yang bukan miliknya.

## Konsekuensi

- UI retur menyembunyikan opsi tunai bila sesi asal `closed`, dan
  menjelaskan alasannya ke kasir (bukan sekadar menghilangkan tombol
  tanpa penjelasan).
- Refund non-tunai ke deposit mengikuti alur `DepositService::record()`
  yang sama seperti refund normal (idempotency_key wajib).
- Test wajib: "retur pasca-tutup-sesi refund non-tunai wajib" (Fase 18).

## Tanggal Peninjauan Ulang

Setelah Fase 11 (Retur, Void & Koreksi) selesai.
