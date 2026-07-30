# CATATAN PERBAIKAN — KONSOLIDASI DARI REVIEW

Semua perbaikan yang saya temukan dari review rencana asli, dikelompokkan per
fase. Dokumen ini WAJIB dibaca sebelum setiap sesi coding — dan disebutkan
eksplisit di prompt sesi terkait.

Kategori:
- 🔴 **KRITIS** — mengubah struktur data / logika inti, tidak boleh dilewat
- 🟡 **PENTING** — memperbaiki konsistensi atau performa
- 🟢 **PENAJAMAN** — pembaikan halus, tidak merusak kalau dilewati

---

## FASE 1 — AUTH, ROLE, PIN

### 🔴 Konflik istilah receivable

Fase 1 pakai `receivable.write_off`. Fase 9 halaman menyebut "hapus piutang".
Pilih satu istilah:

**Keputusan:** pakai **`receivable.delete`** untuk permission, istilah UI
**"Hapus Piutang"**. Hanya owner yang punya izin ini, hanya untuk piutang
> 90 hari. Semua tempat konsisten.

### 🟡 Session timeout per role (untuk konteks online)

Rencana asli tidak spesifik. Karena aplikasi online:
- cashier: 30 menit idle
- warehouse: 1 jam
- treasurer/admin/supervisor: 2 jam
- owner: 8 jam
- guardian (wali): 2 jam

Implementasi: middleware `AdjustSessionLifetime` yang set
`config('session.lifetime')` berdasarkan role user sebelum session di-write.

### 🟡 Field tambahan users untuk online

```php
$table->string('last_login_ip')->nullable();
$table->string('last_login_user_agent', 500)->nullable();
$table->boolean('two_factor_enabled')->default(false);
$table->text('two_factor_secret')->nullable(); // encrypted
$table->text('two_factor_recovery_codes')->nullable(); // encrypted
```

---

## FASE 2 — MASTER DATA

### 🟡 product_prices immutable

Rencana asli menyimpan `created_by` tanpa `updated_by` — implisit immutable
tapi tidak eksplisit. **Tegaskan:**

- Tabel `product_prices` **TIDAK punya `updated_at`**
- Tidak ada endpoint update — ganti harga = tutup baris lama (isi
  `effective_to`) + insert baris baru
- Ini akan tercek otomatis kalau UI tidak sediakan form edit

### 🔴 Kolom baru untuk storefront

Tambahkan ke tabel `products`:

```php
$table->boolean('is_visible_public')->default(false);
$table->string('slug')->unique()->nullable(); // generate saat visible=true
$table->text('description_public')->nullable();
$table->integer('public_order')->nullable();
```

Kolom baru untuk multi-gambar (tabel baru `product_images`):

```php
Schema::create('product_images', function (Blueprint $t) {
    $t->id();
    $t->foreignId('product_id')->constrained()->cascadeOnDelete();
    $t->string('path');
    $t->string('alt')->nullable();
    $t->integer('sort_order')->default(0);
    $t->boolean('is_primary')->default(false);
    $t->timestamps();
});
```

Field `products.image` (tunggal) DIHAPUS — semua migrasi ke `product_images`.

### 🟢 Kolom HPP hidden via Inertia

Bila user tidak punya `product.view_cost`, Inertia controller jangan kirim
kolom `hpp`, `avg_cost`, `margin`, dsb ke React. Cek via `$user->can()`
di controller.

---

## FASE 3 — ANGGOTA & KARTU

### 🔴 Buang allow_negative & credit_limit

Konflik dengan Fase 9 metode Kredit. Pilih satu — pakai metode Kredit.

**Hapus dari tabel members:**
```php
$table->boolean('allow_negative')->default(false); // HAPUS
$table->bigInteger('credit_limit')->default(0); // HAPUS
```

**Ganti dengan:**
```php
$table->bigInteger('receivable_limit')->default(0);
// Batas TOTAL piutang aktif per anggota. Dicek di Fase 9.
```

### 🟡 blocked_categories cleanup

`blocked_categories` (JSON) rentan bocor bila kategori dihapus.

**Solusi:** buat listener `CategoryDeleting`:

```php
class RemoveCategoryFromMemberBlocklist
{
    public function handle(CategoryDeleting $event) {
        $catId = $event->category->id;
        // Update semua member yang punya cat id ini di blocked_categories
        DB::table('members')
            ->whereJsonContains('blocked_categories', $catId)
            ->chunkById(500, function ($chunk) use ($catId) {
                foreach ($chunk as $m) {
                    $arr = json_decode($m->blocked_categories, true) ?? [];
                    $arr = array_values(array_diff($arr, [$catId]));
                    DB::table('members')->where('id', $m->id)
                        ->update(['blocked_categories' => json_encode($arr)]);
                }
            });
    }
}
```

### 🟢 pin_attempts reset

Pastikan `pin_attempts` di-reset ke 0 saat verifikasi PIN sukses.
Rencana asli tidak eksplisit menyebut.

---

## FASE 4 — DEPOSIT

### 🟡 Klarifikasi transfer_in / transfer_out

Rencana asli menyebut tipe deposit `transfer_in` dan `transfer_out` tanpa
penjelasan. Kemungkinan maksudnya transfer antar-kartu saat ganti kartu.

**Keputusan:** rename jadi:
- `card_transfer_out` — saldo keluar dari kartu lama (saat ganti kartu)
- `card_transfer_in` — saldo masuk ke kartu baru

Kedua tipe wajib berpasangan (idempotency_key sama). Ini transfer nol-sum
antar-kartu di anggota yang sama.

### 🔴 idempotency_key WAJIB

`DepositService::record()` di rencana asli hanya menerima idempotency_key
sebagai opsional. **Perkuat:** WAJIB untuk semua caller. Bila NULL, throw
`MissingIdempotencyKeyException`.

Alasan: konteks online = double-submit lebih sering (klik dobel karena
lambat, jaringan retry, dsb).

### 🟢 Rekonsiliasi harian

Tambah kolom `expected_by_recon` di `deposit_reconciliations` untuk melacak
selisih akumulatif. Berguna untuk audit long-term.

---

## FASE 5 — INVENTORY

### 🟢 stocks.reserved_qty — buang atau dokumentasikan

Rencana asli menyebut tanpa jelas kapan dipakai. Hold kasir tidak
mengurangi stok, jadi `reserved_qty` mungkin untuk PO/Transfer in-transit.

**Keputusan:** dokumentasikan eksplisit di komentar migration:
```php
$table->decimal('reserved_qty', 12, 3)->default(0)
    ->comment('Qty yang sudah dialokasikan untuk PO in-transit dan '
        .'Transfer in-transit. TIDAK dipakai untuk hold kasir '
        .'(hold tidak mengurangi stok).');
```

Kalau tidak dipakai sama sekali di Fase 6-12, HAPUS saja di Fase 12.

### 🟡 Batch untuk shared hosting

Command `stock:check-expiry` di shared hosting rentan memory limit.
Wajib chunkById(500) untuk iterasi produk banyak.

---

## FASE 6 — PEMBELIAN

### 🔴 Konsinyasi — MODEL MURNI (bukan beli-saat-terjual)

Konflik di Fase 13 dokumen asli. **Keputusan:** konsinyasi murni, barang
BUKAN aset sekolah.

**Konsekuensi Fase 6:**
- Terima konsinyasi → buat `stock_layers` dengan `is_consignment=true`
- TIDAK ADA jurnal (dijelaskan detail di CATATAN Fase 13)
- TIDAK ADA hutang usaha
- TIDAK ADA nilai persediaan yang dicatat

### 🟢 Retur pembelian tunai — pilihan

Retur pembelian tunai: dua kemungkinan (menambah kas atau terbit piutang
ke supplier). **Keputusan default:** menambah kas (bila supplier
mengembalikan uang saat itu juga). Piutang supplier hanya bila ada
kesepakatan tertulis.

---

## FASE 7 — SESI KASIR

### 🔴 total_receivable_payment — pecah per metode

Rencana asli menaruh `total_receivable_payment` di expected cash, seolah
selalu tunai. Tidak benar — wali bisa bayar piutang via transfer.

**Perbaikan:** pecah kolom di `cashier_sessions`:
```php
$table->bigInteger('total_receivable_cash')->default(0);
$table->bigInteger('total_receivable_noncash')->default(0);
```

Rumus expected cash:
```
expected = opening_cash
         + total_sales_cash
         + total_topup_cash
         + total_receivable_cash          ← hanya yang tunai
         + total_cash_in
         - total_cash_out
         - total_drop
         - total_refund_cash
```

### 🟡 Verifikasi top-up tidak butuh sesi kasir

Verifikasi top-up transfer oleh admin/treasurer TIDAK memerlukan sesi kasir
aktif (uang masuk ke rekening bank, bukan laci). Rencana asli implisit
tidak menyebut ini.

### 🔴 Retur pasca-tutup-sesi

Ini yang tidak ada di rencana asli. **Aturan:** bila sesi kasir asal sudah
tutup:
- Void tidak boleh (sudah ada di Fase 11)
- Retur boleh, TAPI refund WAJIB non-tunai (deposit atau transfer)
- Tidak boleh refund dari kas laci sesi baru (uang laci milik sesi baru,
  bukan sesi lama)

Implementasi: `SaleReturnService::calculateRefundOptions()` cek status
sesi asal — bila closed, hilangkan opsi 'cash' dari daftar metode refund.

---

## FASE 8 — LAYAR KASIR

### 🔴 sales.status = 'hold' — cek saat tutup sesi

Rencana asli Fase 7 punya placeholder "cek transaksi hold saat tutup sesi"
tapi status 'hold' baru dibuat di Fase 8. **Aktifkan di Fase 8:**

Di `CashierSessionService::close()`, sebelum tutup:
```php
$holds = SaleHold::where('cashier_session_id', $session->id)->count();
if ($holds > 0) {
    throw new SessionCannotCloseWithHoldsException($holds);
}
```

### 🟢 Kolom sesi terisi

Fase 7 menyisakan kolom `total_sales_cash`, `total_topup_cash`,
`total_receivable_cash` yang bernilai 0. Fase 8 WAJIB mengisinya via
`CashierSessionService::addSaleCash()` dsb — dipanggil dari
`SaleService::complete()`, `DepositService::topup()`, `ReceivableService::pay()`.

---

## FASE 9 — PEMBAYARAN

### 🔴 Metode Kredit pakai receivable_limit

`allow_negative` sudah dibuang di Fase 3. Metode Kredit sekarang:

```php
public function canUseCredit(Member $member, int $amount): array {
    $activeReceivable = Receivable::where('member_id', $member->id)
        ->whereIn('status', ['unpaid', 'partial', 'overdue'])
        ->sum('remaining_amount');

    $newTotal = $activeReceivable + $amount;

    if ($newTotal > $member->receivable_limit) {
        return ['allowed' => false, 'reason' => 'over_limit',
                'limit' => $member->receivable_limit,
                'active' => $activeReceivable];
    }
    return ['allowed' => true];
}
```

Bila `over_limit` → tolak, kecuali ada override supervisor via PIN.

### 🟡 Split payment

Kembalian HANYA dari porsi tunai. Urutan default optimasi:
Voucher → Poin → Saldo → Tunai (uang fisik dipakai paling akhir).

---

## FASE 10 — DISKON

### 🟡 days_of_week konvensi ISO

Rencana asli tidak eksplisit. **Keputusan:** pakai ISO 8601 —
1=Senin, 7=Minggu. Konsisten dengan `Carbon::dayOfWeekIso()`.

### 🟢 PromoEngine return warnings

Bila potongan dikurangi karena hampir menyentuh HPP, return warnings[]
dalam hasil supaya UI bisa tampilkan info ke kasir.

### 🟢 promos.is_public untuk storefront

Tambah kolom `is_public` (bool, default false) di tabel `promos`.
Promo dengan `is_public=true` tampil di halaman /promo publik (Fase 19).

---

## FASE 11 — RETUR & VOID

### 🔴 Kupon status kembali active

Rencana asli hanya menyebut `coupon_redemptions.is_reverted=true` saat
void. **Wajib tambah:** status kupon di tabel `coupons` KEMBALI ke
'active' (bila belum expired).

```php
public function revertCoupon(CouponRedemption $redemption) {
    DB::transaction(function () use ($redemption) {
        $coupon = $redemption->coupon()->lockForUpdate()->first();
        $redemption->update(['is_reverted' => true]);
        $coupon->decrement('used_count');
        if ($coupon->valid_until >= now()) {
            $coupon->update(['status' => 'active']);
        }
    });
}
```

### 🔴 Retur pasca-tutup-sesi

Sudah disebut di Fase 7 di atas — implementasi konkret di Fase 11.

---

## FASE 13 — AKUNTANSI

### 🔴 Konsinyasi jurnal — MODEL MURNI

Peta jurnal di rencana asli:
```
Terima konsinyasi: TIDAK ADA JURNAL   ✓ (benar)
Jual konsinyasi:  D Kas / K Penjualan
                  D Beban Konsinyasi / K Utang Konsinyasi
```

**Tidak tepat.** Kalau konsinyasi murni, barang bukan aset, tidak ada
"Penjualan" yang jadi milik sekolah. Yang benar:

```
Terima konsinyasi: TIDAK ADA JURNAL
Jual konsinyasi   (harga jual Rp 10.000, komisi sekolah 20%):
  D Kas                 Rp 10.000
  K Utang Konsinyasi         Rp 10.000
  Lalu (untuk mengakui pendapatan komisi):
  D Utang Konsinyasi     Rp 2.000
  K Pendapatan Komisi         Rp 2.000
Settlement (bayar ke pemilik Rp 8.000):
  D Utang Konsinyasi     Rp 8.000
  K Kas                       Rp 8.000
Retur konsinyasi: kurangi layer, TIDAK ADA JURNAL
```

Konsekuensi: laporan L/R menampilkan **Pendapatan Komisi Konsinyasi**
sebagai bagian pendapatan, bukan Penjualan penuh.

Bila mau model **beli-saat-terjual**, itu opsi berbeda yang harus
dinyatakan di ADR. Default kita: **MURNI**.

### 🔴 Deposit sebagai kewajiban — sudah benar di rencana asli, tegaskan

Deposit dicatat sebagai **2-1200 Utang Deposit Anggota**, bukan pendapatan.
Ini benar di rencana asli. Wajib dicek observer.

### 🟡 Observer wajib

Semua Sale, Purchase, DepositTransaction, CashTransaction WAJIB punya
Observer yang otomatis buat jurnal. **Jangan** mengandalkan pemanggilan
manual di service.

---

## FASE 14 — LAPORAN

### 🟢 Reuse dengan Fase 15

Widget dashboard (Fase 15) MEMANGGIL query dari BaseReport. Contoh:
"Peringkat kasir" di dashboard dan "Penjualan per Kasir" di laporan
= satu sumber, `PenjualanPerKasirReport::query()->take(5)`.

### 🟡 Ekspor besar di shared hosting

Ekspor Excel > 5000 baris → antrian via cron queue, kirim email saat
selesai. Shared hosting tidak ada Supervisor, jadi cron polling
setiap menit.

---

## FASE 15 — DASHBOARD

### 🟢 Chart mode gelap

Recharts default tema terang. Wrap dalam komponen yang subscribe ke
theme context, re-render saat theme berubah dengan warna dari CSS var:
```tsx
const isDark = useTheme() === 'dark'
const axisColor = isDark ? '#94A3B8' : '#2E5490'
```

---

## FASE 16 — PORTAL WALI

### 🔴 Login HP + password (bukan OTP)

Sudah diputuskan. Field `guardians.phone` (unique) + `guardians.password`
(bcrypt). Rate limit 5x/menit per HP.

### 🟢 Payment gateway — struktur, bukan aktivasi

Tambah kolom `topup_requests`:
```php
$table->string('payment_provider')->nullable(); // 'manual' di MVP
$table->string('payment_reference')->nullable();
```

Di MVP, semua nilai `payment_provider='manual'`. Fase 19+ nanti
tambahkan Midtrans/Xendit.

### 🟢 WhatsApp NullGateway

Default `NullGateway` yang cuma log, biar dev tidak butuh kredensial.
Fonnte/Wablas implementasi menyusul.

---

## FASE 17 — PENGATURAN

### 🔴 Backup NYATA, bukan cuma UI

Rencana asli hanya menyebut "backup manual/otomatis" tanpa implementasi.
Wajib nyata:

- `php artisan backup:run` — mysqldump + gzip + upload ke Backblaze B2
- Cron harian jam 02:00
- Retention: lokal 30 hari, offsite 90 hari
- Notifikasi ke owner via WA/email bila backup gagal
- Tombol "Uji Restore" — restore ke DB test, cek integritas

Package: `spatie/laravel-backup` (matang, dokumentasi bagus).

### 🟡 Konfirmasi bahaya lebih ketat

Reset data / reset sistem: konfirmasi ketik ulang **nama toko + password
owner** (bukan hanya nama). Rentang waktu 30 detik untuk selesaikan.

---

## FASE 18 — PENGUJIAN, KEAMANAN, DEPLOY

### 🔴 Test tambahan (dari review)

Tambahkan ke daftar test wajib:
- Test: kupon status kembali 'active' setelah void (bila belum expired)
- Test: konsinyasi tidak buat jurnal saat terima
- Test: retur pasca-tutup-sesi refund non-tunai wajib
- Test: receivable_limit menahan kredit di atas batas
- Test: PromoEngine tidak menurunkan harga di bawah HPP
- Test: days_of_week ISO — Senin=1, Minggu=7

### 🟡 Deploy Hostinger — Langkah baru

Rencana asli menyebut "Nginx + PHP-FPM + Supervisor" (VPS). Ganti dengan
langkah Hostinger di URUTAN-KERJA-v2 Sesi 21.

### 🟢 Uji beban ringan

Untuk pesantren dengan 70 santri istirahat bareng, uji dengan `k6` atau
`wrk`: 30 concurrent user selama 5 menit. Target: layar kasir
< 800ms p95. Kalau di atas, upgrade ke VPS.

---

## PERBAIKAN LINTAS-FASE

### 🟡 Idempotency-key di semua write kritis

Endpoint yang WAJIB terima idempotency_key:
- POST /pos/complete (buat nota)
- POST /pos/scan (tambah item)
- POST /admin/deposit/topup
- POST /admin/deposit/withdraw
- POST /wali/top-up (ajukan)
- POST /admin/receivable/{id}/pay
- POST /admin/debt/{id}/pay

Middleware `EnsureIdempotencyKey` cek header `X-Idempotency-Key`. Bila
tidak ada, tolak 400.

### 🟡 Field indexing di database

Untuk MySQL 8 shared hosting, index kolom yang sering di-query:
- `sales(cashier_session_id, sale_date)` — laporan sesi
- `sales(member_id, sale_date)` — riwayat belanja anggota
- `deposit_transactions(member_id, created_at)` — mutasi saldo
- `stock_movements(product_id, outlet_id, created_at)` — kartu stok
- `stock_layers(product_id, outlet_id, qty_remaining, expired_at)` — FEFO
- `journal_entries(account_id, journal_date)` — buku besar

### 🟢 Zakat/infaq (opsional)

Bila ingin fitur "pembulatan ke atas untuk infaq", tambahkan di Fase 17:
- Metode bayar khusus `INFAQ` (tipe: donation)
- Kolom `sales.infaq_amount` (bigint, default 0)
- Jurnal: D Kas / K Utang Infaq (kewajiban salurkan ke lembaga zakat)

Bukan wajib untuk MVP.

### 🟢 Tumpang tindih Fase 14 & 15

Sudah dibahas di Fase 14 di atas. Prinsip: satu sumber query per metric,
di-consume oleh dashboard dan laporan.

---

## RANGKUMAN KEPUTUSAN YANG DITETAPKAN

Untuk dokumentasi cepat, semua keputusan besar:

1. **Kredit anggota** = via metode Kredit (Fase 9), `receivable_limit`
2. **Konsinyasi** = MODEL MURNI
3. **Retur pasca-tutup** = refund WAJIB non-tunai
4. **days_of_week** = ISO (Senin=1)
5. **Deposit ledger** = idempotency_key WAJIB
6. **Backup** = harian, offsite B2, retention 30/90 hari
7. **Login wali** = HP + password (bukan OTP)
8. **Payment gateway** = tunda ke Fase 19+
9. **Storefront** = hanya katalog, `is_visible_public` flag
10. **Deploy** = Hostinger shared hosting

---

*Dokumen ini tumbuh selama proyek berjalan. Update bila ada keputusan
tambahan.*
