# T-032 — `StockService::consume()` FEFO

**Fase induk:** Fase 5 (Inventory & Stock Layer FEFO)
**Estimasi:** M (≤4 jam)

## Deskripsi

Implementasi method `StockService::consume(Product, Outlet, float $qty,
Model $consumer): array` yang mengonsumsi stok dengan urutan FEFO (First
Expired First Out), mencatat konsumsi per layer, dan mengembalikan total
HPP. Dipakai langsung oleh `SaleService::complete()` (T-051) dan
`PurchaseService` retur (T-039).

## Kriteria Penerimaan

- [ ] Method `consume()` di `app/Services/StockService.php` ada
- [ ] Urutan konsumsi: `ORDER BY (expired_at IS NULL), expired_at ASC,
      received_at ASC` (idiom MySQL untuk "NULL di akhir" — `IS NULL`
      menghasilkan 0/1, jadi urutkan ASC pada ekspresi itu dulu)
- [ ] Query pakai `lockForUpdate()` pada baris `stock_layers` yang
      dikonsumsi, di dalam `DB::transaction()`
- [ ] Setiap pengambilan dicatat ke `stock_layer_consumptions`
      (`qty`, `unit_cost`, `total_cost`, morph ke consumer)
- [ ] Bila stok tidak cukup di seluruh layer, lempar
      `InsufficientStockException` dan rollback semua perubahan parsial
      (transaksi tunggal, bukan commit sebagian)
- [ ] Kembalikan array `['total_cost' => int, 'consumptions' =>
      Collection]`
- [ ] `returnToLayer(StockLayerConsumption, float $qty)` mengembalikan
      `qty_remaining` ke layer **asal** (bukan bikin layer baru), tandai
      `is_returned`
- [ ] `recalculateCache()`, `getAvailable()`, `getExpiringSoon()`,
      `getExpired()` tersedia sebagai method pendukung
- [ ] Test unit minimal 5 skenario: layer tunggal, multi-layer, stok
      tidak cukup, dengan expired, tanpa expired (produk non-expirable
      otomatis berperilaku FIFO)

## Blocking Edges

- T-031 (tabel stock_layers, stock_layer_consumptions) harus sudah
  selesai.

## Referensi

- ADR-0004: Stok pakai FEFO Layer
- CONTEXT.md § Persediaan (FEFO, Consume, HPP)
- SPEC.md § 4 poin 6–9
- `PROMPT-POS-SKILLAGE-MART.md` § Fase 5, bagian 2

## Catatan Implementasi

- SQL urutan FEFO di MySQL 8: `ORDER BY (expired_at IS NULL) ASC,
  expired_at ASC, received_at ASC` — jangan lupa parentheses, `IS NULL`
  menghasilkan boolean 0/1 yang bisa langsung dipakai `ORDER BY`.
- `lockForUpdate()` **wajib** di dalam `DB::transaction()`, jangan di
  luar — kalau dipanggil di luar transaksi, lock dilepas sebelum
  perubahan tersimpan dan race condition tetap mungkin terjadi.
- Jangan bikin `stock_movements` di service ini — itu tugas orkestrator
  (`SaleService`, `PurchaseService`) supaya konteksnya jelas dari
  pemanggil, bukan dari dalam `StockService` yang generik.
- HPP per baris nota (`SaleItem.unit_cost`) diisi dari `total_cost`
  hasil `consume()`, **bukan** dari `products.avg_cost` atau harga beli
  terakhir — ini biaya aktual layer yang benar-benar dipakai (FEFO).
