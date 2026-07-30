# CONTEXT.md — Kamus Domain Skillage Mart POS

Dokumen ini menetapkan istilah baku yang dipakai konsisten di seluruh kode,
UI, dokumentasi, dan komunikasi tim. Perubahan istilah wajib melalui
Pull Request dan diskusi eksplisit.

Disintesis dari `README-v2.md`, `CATATAN-PERBAIKAN.md`, dan
`PROMPT-POS-SKILLAGE-MART.md` (isi asli Fase 1–18) — bukan requirement baru.

---

## Mart / Toko

Minimarket yang dikelola SMK Skill Village Islamic School di lingkungan
pesantren (Jonggol, Kabupaten Bogor). Pembeli utamanya adalah santri yang
membayar dengan saldo deposit lewat kartu anggota barcode.

## Outlet

Satu lokasi fisik mart. Saat ini satu outlet: "Skillage Mart". Semua
transaksi terikat ke satu outlet via `outlet_id`.

---

## Aktor

| Istilah UI (Indonesia) | Istilah Kode (English) | Definisi Singkat |
|---|---|---|
| Santri | `Member` (type: `santri`) | Pelajar SMK Skill Village, pemegang kartu utama, tidak boleh pegang tunai banyak |
| Wali santri | `Guardian` | Orang tua/wali dari 1+ santri, akses via Portal Wali |
| Fasilitator | `Member` (type: `fasilitator`) | Guru — bisa beli & bisa jadi kasir |
| Staf | `Member` (type: `staff`) | Non-guru non-santri |
| Umum | `Member` (type: `public`) | Warga luar pesantren (jarang) |
| Owner | `User` (role: `owner`) | Kepala sekolah / penanggung jawab. Eksklusif: hapus piutang, penyesuaian saldo, tutup buku, reset sistem, lihat HPP & margin |
| Admin | `User` (role: `admin`) | Semua modul kecuali kewenangan eksklusif owner |
| Supervisor | `User` (role: `supervisor`) | Otorisasi PIN: void, ubah harga, diskon di atas batas, approve opname & selisih kas |
| Kasir | `User` (role: `cashier`) | Operator layar kasir. Tidak bisa lihat HPP/margin dan laporan keuangan |
| Warehouse | `User` (role: `warehouse`) | Pembelian, penerimaan, opname, transfer, laporan stok |
| Bendahara | `User` (role: `treasurer`) | Kas, hutang, piutang, jurnal, buku besar, laporan keuangan |

Permission berformat `modul.aksi`, contoh: `product.view`, `sale.void`,
`product.view_cost`, `receivable.delete`. Otorisasi supervisor lewat PIN:
`AuthorizationService::requestOverride()`.

---

## Uang & Saldo

| Istilah UI | Istilah Kode | Definisi |
|---|---|---|
| Saldo | `deposit_balance` | Uang santri di sistem, sumber utama pembayaran |
| Top-up | `TopUp` / `deposit.topup` | Penambahan saldo santri |
| Ledger deposit | `DepositTransaction` | Baris **append-only** mutasi saldo — tidak pernah diubah/dihapus |
| Balance cache | `members.balance_cache` | Cache performa saja. Sumber kebenaran = `SUM(amount)` dari ledger. Wajib direkonsiliasi harian |
| Kas | `CashAccount` | Wadah uang fisik: laci, brankas, bank, e-wallet |
| Laci | `CashAccount` (type=cash, is_drawer=true) | Kas fisik kasir |
| Brankas | `CashAccount` (type=cash, is_drawer=false) | Kas fisik non-laci |
| Drop Cash | — | Transfer laci → brankas di tengah shift. Bukan pengeluaran, transfer antar akun kas |

**Deposit bukan pendapatan** — dicatat sebagai kewajiban mart (akun 2-1200
"Utang Deposit Anggota"). Lihat ADR-0003.

Tipe mutasi deposit: Top-Up, Charge/Purchase, Withdrawal (butuh approval),
Adjustment (manual owner, wajib alasan + audit log), Refund (ikut metode
bayar asal), `card_transfer_out`/`card_transfer_in` (ganti kartu, berpasangan
dengan `idempotency_key` sama).

---

## Transaksi

| Istilah UI | Istilah Kode | Definisi |
|---|---|---|
| Nota / Transaksi | `Sale` | Satu transaksi jual di kasir |
| Baris nota | `SaleItem` | Satu produk dalam nota, HPP di-snapshot dari FEFO consumption |
| Hold | `SaleHold` | Nota ditangguhkan sementara, hangus saat sesi tutup |
| Void | `Sale.status = void` | Pembatalan nota **setelah selesai**. Membalikkan semua efek: stok, saldo, kupon, poin, piutang, kas, jurnal. Hanya saat sesi masih terbuka, butuh PIN supervisor |
| Retur | `SaleReturn` | Pengembalian barang, maks N hari (default 7). Beda dari void: bisa dilakukan setelah sesi tutup — tapi refund **wajib non-tunai** bila sesi asal sudah tutup |
| Refund | (bagian dari SaleReturn) | Pengembalian nilai bayar, **selalu** ikut metode asal — tidak bisa dikonversi ke tunai |
| Sesi kasir | `CashierSession` | Periode kerja satu kasir di satu laci, dari buka sampai tutup. **Tidak bisa dibuka kembali** setelah tutup — koreksi lewat jurnal |
| Modal Awal | Opening Cash | Uang tunai diserahkan saat buka sesi |
| Expected Cash | — | modal awal + tunai penjualan + tunai top-up + tunai pelunasan piutang + kas masuk − kas keluar − drop − refund tunai. Penjualan deposit/non-tunai **tidak masuk hitungan** |
| Selisih Kas | Actual − Expected | Negatif → Beban Selisih Kas. Positif → Pendapatan Selisih Kas |

Nomor nota (`reference`, format `PREFIX-YYYYMMDD-NNNN`, sekuensial per
outlet per hari) **tidak pernah dipakai ulang**, termasuk yang di-void.
Harga di nota **di-snapshot**, tidak diambil ulang dari master saat cetak
ulang.

---

## Persediaan

| Istilah UI | Istilah Kode | Definisi |
|---|---|---|
| Produk | `Product` | Item yang dijual |
| SKU | `Product.sku` | Kode unik produk |
| Barcode | `ProductBarcode` | Kode barcode fisik (satu produk banyak barcode) |
| Stok | `Stock` (cache) + `StockLayer` (sumber kebenaran) | Stok bukan satu angka — tumpukan layer |
| Layer | `StockLayer` | Satu tumpukan stok dari satu penerimaan, dengan HPP & `expired_at` sendiri |
| FEFO | *First Expired First Out* | Konsumsi layer: `expired_at` ASC (NULL terakhir), lalu `received_at` ASC. Tanpa expired → otomatis FIFO |
| Consume | `StockService::consume()` | Kurangi `qty_remaining` layer, catat di `stock_layer_consumptions` agar retur bisa kembali ke layer asal |
| HPP | `unit_cost` / `total_cost` | Biaya perolehan aktual dari layer yang dikonsumsi (FEFO) — bukan harga beli terakhir, bukan rata-rata |
| Opname | `StockOpname` | Hitung fisik berkala. `system_qty` **dibekukan** saat status → `counting` (blind count) |
| Konsinyasi | flag `is_consignment` | Barang titipan supplier, **bukan aset mart**. **TIDAK ADA jurnal** saat terima. Jual → akui utang konsinyasi + pendapatan komisi. Lihat ADR-0006 |

---

## Diskon

Prioritas diskon **3 tahap** wajib (lihat SPEC.md § Aturan Bisnis Kritis).
`days_of_week` promo pakai konvensi **ISO 8601** (1=Senin, 7=Minggu).
Harga akhir per item **tidak pernah** di bawah HPP — diskon dipotong sampai
batas HPP bila perlu.

---

## Kredit Anggota

**Tidak ada `allow_negative`.** Belanja di atas saldo → terbit `Receivable`
(piutang) via metode bayar "Kredit/Tempo". Field `receivable_limit` di
tabel `members` = batas total piutang aktif per anggota. Lihat ADR-0005.

---

## Akuntansi

| Istilah UI | Istilah Kode | Definisi |
|---|---|---|
| Jurnal | `JournalEntry` | Catatan double-entry. Wajib seimbang (debit = kredit), tidak seimbang → exception |
| COA | Chart of Account | Daftar akun terstruktur. Akun sistem tidak bisa dihapus |
| Utang Deposit Anggota | Akun 2-1200 | Kewajiban mart atas total saldo deposit anggota |
| Aging | Aging Report | Piutang/hutang dikelompokkan: 0–30, 31–60, 61–90, >90 hari |

---

## Storefront & Portal Wali

| Istilah UI | Istilah Kode | Definisi |
|---|---|---|
| Katalog | Halaman publik `/produk` | Daftar produk publik. **Tidak** menampilkan angka stok (hanya badge Tersedia/Habis) atau HPP/margin |
| Portal Wali | Rute `/wali` | Area login wali (HP + password, bukan OTP), lihat saldo & riwayat anak |
| Ajukan Top-Up | `TopupRequest` | Permohonan top-up dari wali via upload bukti transfer manual. `payment_provider` selalu `'manual'` di MVP |

Produk dengan `is_visible_public = false` **dilarang** muncul di storefront
apapun caranya.

---

## Istilah Teknis

| Istilah | Definisi |
|---|---|
| Reference | Nomor unik transaksi, format `PREFIX-YYYYMMDD-NNNN`, sekuensial per outlet per hari, tidak pernah dipakai ulang |
| Idempotency Key | UUID pada setiap operasi tulis kritis untuk mencegah double-submit |
| Supervisor Override | Otorisasi PIN untuk aksi melampaui wewenang kasir biasa |
| Soft Delete | Tidak ada hard delete di tabel transaksi — pakai `deleted_at` atau kolom status |
| Token (warna) | CSS custom property (`bg-surface`, `text-content`, `border-border`) yang berubah sesuai mode terang/gelap — dipetakan lewat `@theme inline` di Tailwind v4 (lihat ADR-0001) |

## Singkatan

| Singkatan | Kepanjangan | Konteks |
|---|---|---|
| HPP | Harga Pokok Penjualan | Biaya perolehan barang |
| FEFO | First Expired First Out | Metode konsumsi stok |
| PO | Purchase Order | Pesanan pembelian ke supplier |
| PB | Penerimaan Barang / Pembelian | Faktur pembelian |
| COA | Chart of Account | Daftar akun akuntansi |
| ADR | Architectural Decision Record | Catatan keputusan arsitektur |
| MDR | Merchant Discount Rate | Potongan biaya QRIS/kartu |
| SKM | Skillage Mart | Kode prefix nomor anggota & produk |

## Prefiks Referensi

| Prefiks | Transaksi | Prefiks | Transaksi |
|---|---|---|---|
| INV | Penjualan | DEP | Mutasi Deposit |
| RJ | Retur Penjualan | TOP | Top-Up |
| PO | Purchase Order | SES | Sesi Kasir |
| PB | Pembelian | KAS | Kas Masuk/Keluar |
| RB | Retur Pembelian | JU | Jurnal Umum |
| SO | Stock Opname | HTG | Pembayaran Hutang |
| TF | Transfer Stok | PTG | Pembayaran Piutang |
| ADJ | Penyesuaian Stok | KON | Settlement Konsinyasi |
| WO | Write-Off | HOLD | Transaksi Ditahan |
| REQ | Request Top-Up dari Wali | | |

---

## Istilah yang DILARANG

- ❌ "Pembeli" / "Customer" — pakai **Member** atau tipe spesifiknya (Santri, dll)
- ❌ "E-money" — pakai **Saldo Deposit** atau **Deposit**
- ❌ "Balance" mentah — selalu spesifik: **balance_cache** (kolom) atau **ledger sum** (agregasi)
- ❌ "Guru" — pakai **Fasilitator** (identitas sekolah)
- ❌ "allow_negative" / "credit_limit" — sudah dibuang, pakai **receivable_limit** + metode Kredit

---

*Kamus ini dikunci setelah ditinjau. Perubahan istilah wajib PR + diskusi
eksplisit. Rujuk `docs/adr/` untuk alasan di balik keputusan arsitektur
terkait.*
