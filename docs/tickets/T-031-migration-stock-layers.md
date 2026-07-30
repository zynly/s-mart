# T-031 — Migration `stock_layers` + `stock_layer_consumptions` + `stocks` (Cache)

**Fase induk:** Fase 5 (Inventory & Stock Layer FEFO)
**Estimasi:** M (≤4 jam)

## Deskripsi

Struktur data inti untuk stok berlapis (bukan angka tunggal), fondasi
metode FEFO yang dipakai seluruh alur penjualan dan pembelian di fase
berikutnya.

## Kriteria Penerimaan

- [ ] Tabel `stock_layers`: `product_id`, `outlet_id`, `qty_in`/
      `qty_remaining` (decimal 12,3), `unit_cost` (bigint), `batch_no`
      nullable, `expired_at` nullable, `received_at`, morph
      `sourceable` (Purchase/Transfer/Opname), `is_consignment` (bool),
      `supplier_id` nullable
- [ ] Index: `(product_id, outlet_id, qty_remaining)`, `(expired_at)`,
      `(received_at)` — wajib untuk performa query FEFO
- [ ] Tabel `stock_layer_consumptions`: `stock_layer_id`, `qty`,
      `unit_cost`, `total_cost`, morph `consumableable`
      (SaleItem/TransferItem), `is_returned` (default false)
- [ ] Tabel `stock_movements` (kartu stok): `type` enum (purchase, sale,
      sale_return, purchase_return, transfer_in, transfer_out,
      adjustment, opname, write_off, expired, consignment_in,
      consignment_return), `qty` signed, `qty_before`/`qty_after`,
      `stock_layer_id` nullable
- [ ] Tabel `stocks` (cache agregat): `qty`, `reserved_qty` (dengan
      komentar migration menjelaskan kegunaannya — lihat catatan),
      `avg_cost`, `last_cost`, unique `(product_id, outlet_id)`

## Blocking Edges

- T-012 (migration products) harus sudah selesai.

## Referensi

- ADR-0004: Stok pakai FEFO Layer, bukan average cost sederhana
- CONTEXT.md § Persediaan
- `PROMPT-POS-SKILLAGE-MART.md` § Fase 5, bagian 1
- `CATATAN-PERBAIKAN.md` § Fase 5

## Catatan Implementasi

- `stocks.reserved_qty` **wajib diberi komentar migration eksplisit**
  (per `CATATAN-PERBAIKAN.md`): kolom ini untuk qty yang dialokasikan
  PO/Transfer in-transit — **bukan** untuk hold kasir (hold tidak
  mengurangi stok sama sekali). Bila sampai Fase 12 kolom ini tidak
  pernah benar-benar dipakai, hapus (lihat T-076).
- `stocks.qty` **hanya cache** dari `SUM(qty_remaining)` seluruh layer
  aktif — sumber kebenaran selalu `stock_layers`. Wajib bisa
  direkonsiliasi via `stock:recalculate-cache`.
- Jangan gunakan kolom stok tunggal di `products` — semua query
  ketersediaan stok wajib lewat `StockService::getAvailable()` (T-032),
  tidak langsung ke tabel.
