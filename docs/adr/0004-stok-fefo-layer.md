# ADR-0004: Stok pakai FEFO Layer, bukan average cost sederhana

**Status:** Diterima
**Tanggal:** 2026-07-30
**Konteks:** Produk minimarket (makanan/minuman) punya tanggal kadaluwarsa.
Metode HPP rata-rata sederhana tidak mencerminkan urutan konsumsi yang
benar dan berisiko kerugian akibat produk kadaluwarsa tidak terjual
lebih dulu.

## Keputusan

Stok disimpan sebagai **tumpukan layer** (`StockLayer`), satu layer per
penerimaan barang, masing-masing dengan `unit_cost` dan `expired_at`
sendiri. Konsumsi mengikuti **FEFO (First Expired First Out)**: urutan
`expired_at ASC` (NULL di akhir), lalu `received_at ASC` — produk tanpa
tanggal kadaluwarsa otomatis berperilaku FIFO.

`stocks.qty` adalah cache dari `SUM(qty_remaining)` seluruh layer aktif
— hanya untuk performa, wajib direkonsiliasi.

## Alternatif yang Dipertimbangkan

1. **Average cost** — sederhana, tapi tidak mendorong penjualan barang
   yang lebih dulu kadaluwarsa, dan HPP jadi kurang akurat per batch.
2. **LIFO** — tidak relevan untuk retail makanan/minuman dengan expiry.

## Konsekuensi

- Setiap penjualan mencatat `stock_layer_consumptions` (bukan hanya
  mengurangi angka stok), supaya retur bisa dikembalikan ke **layer
  asal** — bukan membuat layer baru.
- Query FEFO wajib pakai `lockForUpdate()` di dalam `DB::transaction()`
  untuk mencegah race condition saat penjualan konkuren.
- HPP per baris nota = biaya aktual layer yang dikonsumsi (bukan harga
  beli terakhir, bukan rata-rata).
- Command `stock:check-expiry` wajib `chunkById()` untuk menghindari
  memory limit di shared hosting.

## Tanggal Peninjauan Ulang

Setelah Fase 5 (Inventory) dan Fase 12 (Opname) selesai — evaluasi
apakah kolom `stocks.reserved_qty` (dialokasikan untuk PO/Transfer
in-transit) benar-benar terpakai; hapus di Fase 12 bila tidak.
