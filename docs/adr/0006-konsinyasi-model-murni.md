# ADR-0006: Konsinyasi model murni (barang bukan aset mart)

**Status:** Diterima
**Tanggal:** 2026-07-30
**Konteks:** Rencana asli Fase 13 (Akuntansi) memetakan jurnal konsinyasi
dengan cara yang tidak konsisten — mengakui "Penjualan" penuh milik mart
saat barang konsinyasi terjual, padahal barang itu tidak pernah jadi
aset mart.

## Keputusan

Konsinyasi memakai **model murni**:
- **Terima konsinyasi** → buat `stock_layers` dengan `is_consignment =
  true`. **Tidak ada jurnal**, tidak ada hutang usaha, tidak ada nilai
  persediaan dicatat.
- **Jual barang konsinyasi** (mis. harga jual Rp 10.000, komisi mart
  20%): debit Kas Rp 10.000 / kredit Utang Konsinyasi Rp 10.000; lalu
  debit Utang Konsinyasi Rp 2.000 / kredit Pendapatan Komisi Rp 2.000.
- **Settlement** (bayar sisa ke pemilik barang, Rp 8.000): debit Utang
  Konsinyasi / kredit Kas.
- **Retur barang konsinyasi**: kurangi layer, tidak ada jurnal.

## Alternatif yang Dipertimbangkan

**Beli-saat-terjual** (consignment "buy on sale") — mart mengakui beli
dari supplier tepat saat barang terjual ke pelanggan, lalu mencatat
penjualan penuh + HPP seperti barang biasa. Ditolak sebagai default:
lebih rumit untuk direkonsiliasi dan tidak mencerminkan bahwa barang
sungguh-sungguh bukan milik mart sampai terjual. Boleh dipakai di masa
depan sebagai opsi per-supplier, tapi butuh ADR baru bila diaktifkan.

## Konsekuensi

- Laporan Laba/Rugi menampilkan **Pendapatan Komisi Konsinyasi**
  terpisah dari Penjualan biasa — bukan penjualan penuh barang titipan.
- `StockService` harus membedakan layer `is_consignment` saat FEFO
  consume (HPP komisi ≠ HPP barang milik mart).
- Test wajib: "konsinyasi tidak buat jurnal saat terima" (lihat Fase 18
  di `CATATAN-PERBAIKAN.md`).

## Tanggal Peninjauan Ulang

Setelah Fase 6 (Pembelian & Konsinyasi) dan Fase 13 (Akuntansi) selesai.
