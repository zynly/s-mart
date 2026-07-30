# T-051 — `SaleService::complete()` — Orkestrasi Stok FEFO + Saldo + Jurnal + Kas

**Fase induk:** Fase 8 (Layar Kasir POS)
**Estimasi:** L (≤8 jam) — jantung kasir, kemungkinan perlu dipecah lebih
lanjut saat eksekusi bila > 8 jam

## Deskripsi

Method inti yang mengorkestrasi seluruh efek satu transaksi penjualan:
konsumsi stok FEFO, perhitungan laba kotor, pemrosesan pembayaran
(termasuk potong saldo/kredit), jurnal otomatis, dan update sesi kasir —
semua dalam satu transaksi database atomik.

## Kriteria Penerimaan

- [ ] `complete(cart, array $payments): Sale` dibungkus `DB::transaction()`
      tunggal — bila satu langkah gagal, semua rollback
- [ ] Langkah 1: cek `idempotency_key` — bila sudah pernah diproses,
      kembalikan `Sale` yang sudah ada (bukan buat duplikat)
- [ ] Langkah 2: buat `Sale` + `SaleItem` (harga di-snapshot dari
      `PriceService::getActivePrice()` saat itu, bukan referensi live)
- [ ] Langkah 3: untuk tiap item, panggil `StockService::consume()`
      (T-032) → dapat `total_cost` per item
- [ ] Langkah 4: hitung `gross_profit` (subtotal − diskon − total HPP)
- [ ] Langkah 5: proses pembayaran via `PaymentService` (T-056) —
      termasuk split payment, deposit+PIN, kredit
- [ ] Langkah 6: catat `stock_movements` (kartu stok) untuk tiap item
- [ ] Langkah 7: jurnal otomatis via Observer (T-081), **bukan**
      dipanggil manual di sini
- [ ] Langkah 8: update kolom `cashier_sessions` via
      `CashierSessionService::addSaleCash()` dkk (T-045/T-054)
- [ ] `hold(cart): SaleHold` dan `recall(SaleHold): array` berfungsi
      (transaksi ditangguhkan sementara, hangus saat sesi tutup)
- [ ] `void(Sale, string $reason, User $approver): void` — hanya boleh
      saat sesi masih terbuka, butuh PIN supervisor
- [ ] Struk (thermal 58mm & 80mm) mencetak dengan format snapshot harga,
      nomor nota, saldo akhir (bila bayar pakai deposit)

## Blocking Edges

- T-032 (StockService FEFO), T-045 (CashierSessionService), dan T-056
  (PaymentService) harus sudah selesai.

## Referensi

- CONTEXT.md § Transaksi (Sale, Void, Hold)
- SPEC.md § 4 poin 10, 12–13
- `PROMPT-POS-SKILLAGE-MART.md` § Fase 8, bagian 5–7

## Catatan Implementasi

- Identifikasi anggota punya **3 jalur** yang semua bermuara ke
  `member_id`: scan kartu (`CardService::resolve()`), ketik NIS/nomor
  anggota, atau cari nama dengan pratinjau. Setelah terpilih, tampilkan
  foto, nama, saldo, badge level, dan peringatan limit (bila piutang
  mendekati `receivable_limit`) — bukan hanya nama polos.
- Jangan bikin jurnal secara manual di dalam `SaleService` — Observer
  (T-081) yang bertanggung jawab, supaya konsisten dengan Purchase,
  DepositTransaction, dan CashTransaction lainnya (aturan dari
  `CATATAN-PERBAIKAN.md` § Fase 13).
- `void()` membalikkan **semua** efek transaksi ini: stok kembali ke
  layer asal, saldo deposit (bila dipakai) kembali, kupon kembali
  `active`, poin dibatalkan, jurnal pembalik — didetailkan penuh di
  `VoidService` (T-070), `SaleService::void()` di sini cukup jadi
  pemicu/orkestrator awal.
- Format struk **harus** menampilkan saldo akhir (bila bayar pakai
  deposit) — santri perlu tahu sisa saldonya tanpa harus tanya kasir.
