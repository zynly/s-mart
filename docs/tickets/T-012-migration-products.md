# T-012 — Migration Products + Kategori + Konversi Satuan

**Fase induk:** Fase 2 (Master Data)
**Estimasi:** L (≤8 jam)

## Deskripsi

Migration inti master data: outlet, kategori (pohon 1 tingkat), brand,
satuan, konversi satuan antar-unit, produk, dan supplier — fondasi untuk
seluruh transaksi (kasir, pembelian, stok, storefront) di fase-fase
berikutnya.

## Kriteria Penerimaan

- [ ] Tabel `outlets`, `categories` (self-relation `parent_id`), `brands`,
      `units`, `unit_conversions` (`factor` decimal, `barcode` nullable —
      mis. 1 DUS = 24 PCS punya barcode dus sendiri)
- [ ] Tabel `products`: `sku` unique, `slug`, `category_id`, `brand_id`,
      `base_unit_id`, `is_expirable`, `is_consignment`,
      `consignment_percent` nullable, `min_stock`, `max_stock`,
      `is_favorite`, `SoftDeletes`
- [ ] Kolom `products.image` (tunggal) **tidak dibuat** — diganti tabel
      `product_images` terpisah (lihat T-015)
- [ ] Tabel `suppliers`: `payment_term_days` (default 0 = tunai),
      `is_consignor` (bool)
- [ ] Tabel `payment_methods`: `type` enum (cash, card, qris, ewallet,
      transfer, deposit, voucher, point, credit, payroll),
      `mdr_percent`, `requires_reference`, `allows_change` (hanya tunai
      = true)
- [ ] Seeder: 1 outlet utama, satuan (PCS/DUS/PAK/BOX/KG/LITER/RENCENG),
      7 kategori, 9 metode bayar

## Blocking Edges

- T-006 harus sudah selesai (butuh role `warehouse`/`admin` untuk akses
  master data).

## Referensi

- CONTEXT.md § Persediaan
- SPEC.md § 4 poin 1 (nominal BIGINT), § 6 (Fase 2)
- `PROMPT-POS-SKILLAGE-MART.md` § Fase 2, bagian 1
- `CATATAN-PERBAIKAN.md` § Fase 2

## Catatan Implementasi

- `product_prices` (T-014) sengaja dipisah dari tiket ini karena
  **immutable** (tanpa `updated_at`, ganti harga = insert baris baru) —
  perlakuannya beda dari tabel master biasa, lihat T-014 tersendiri.
- Harga aktif dihitung: `effective_from <= today AND (effective_to IS
  NULL OR effective_to >= today)` — bukan "harga terbaru" secara naif,
  karena bisa ada harga terjadwal di masa depan.
- `BarcodeResolverService::resolve()` harus mengembalikan
  `qty_multiplier` (mis. scan barcode DUS → multiplier 24) — dipakai
  langsung oleh `SaleService` (T-051) dan `PurchaseService` (T-039) saat
  scan.
