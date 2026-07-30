# PRE-01 — GRAPHIFY: PELAJARI POS OPEN-SOURCE (OPSIONAL)

**Tujuan:** memetakan arsitektur POS Laravel open-source yang layak jadi
referensi, supaya Ziyad tidak mengulang kesalahan desain umum dan bisa
mengambil pola yang sudah teruji. Output: `docs/CATATAN-REFERENSI.md`.

**Kapan dilewati:** kalau Ziyad yakin membangun **sepenuhnya dari nol** tanpa
membaca kode orang lain. Jujur, untuk POS skala Skillage Mart, saya **sarankan
tidak dilewati** — banyak keputusan halus (misal: bagaimana stok berlapis
diimplementasikan di Laravel) yang lebih baik dipelajari dari kode nyata dulu.

**Estimasi waktu:** 90 menit.
**Prasyarat:** pre-00 selesai, Python 3.12 ter-install.

---

## 1. PILIH REPO REFERENSI

Fokus ke 1–2 repo, bukan 5. Terlalu banyak membingungkan.

### Rekomendasi utama

| Repo | Kenapa relevan | URL |
|---|---|---|
| **Sale (SamPie/Sale)** | POS Laravel + Livewire, sederhana, mirip skala Skillage Mart | github.com/SamPie/Sale |
| **Krayin CRM POS** | Struktur modular Laravel besar, cocok untuk belajar packaging | github.com/krayin/laravel-crm |
| **Bagisto POS** | POS + e-commerce, ada storefront + admin sekaligus | github.com/bagisto/bagisto |
| **hi-folks/pos-laravel** | Kecil, cocok untuk warming-up | github.com/hi-folks/pos-laravel |

### Yang saya rekomendasikan konkret

Ambil **dua repo dengan sudut pandang berbeda**:

1. **Bagisto** — untuk melihat bagaimana **storefront publik + admin panel + kasir**
   digabung dalam satu Laravel monolith. Ini persis skenario Ziyad.
2. **Sale (SamPie)** — untuk melihat implementasi **kasir + stok + laporan**
   yang simpel, mudah dibedah, dan Livewire (pola state-nya mirip Inertia).

Kalau kuota waktu terbatas, cukup Bagisto.

---

## 2. CLONE REPO

```powershell
cd C:\laragon\www
mkdir _references
cd _references

git clone --depth 1 https://github.com/bagisto/bagisto.git
git clone --depth 1 https://github.com/SamPie/Sale.git
```

`--depth 1` = clone tanpa history, hemat bandwidth.

**Catatan:** folder `_references` sengaja diawali underscore supaya jelas ini
bukan bagian proyek utama. **Jangan** di-commit ke repo Skillage Mart.

Tambahkan ke `.gitignore` root proyek:

```gitignore
# Referensi eksternal, tidak masuk repo
_references/
```

---

## 3. INSTAL GRAPHIFY

```powershell
pip install graphifyy
graphify install
```

Verifikasi:

```powershell
graphify --version
```

---

## 4. JALANKAN GRAPHIFY

### Untuk Bagisto

```powershell
cd C:\laragon\www\_references\bagisto
graphify .
```

Proses ini bisa 10–30 menit untuk repo besar seperti Bagisto. Sabar.

Output ada di `graphify-out/`:

```
graphify-out/
├── graph.html         # buka di browser
├── GRAPH_REPORT.md    # baca ini dulu
└── graph.json         # untuk query lanjutan
```

### Untuk Sale

```powershell
cd C:\laragon\www\_references\Sale
graphify .
```

Proses lebih cepat karena kecil (5–10 menit).

---

## 5. ANALISIS OUTPUT

### 5.1 Buka `GRAPH_REPORT.md` — cari 3 hal ini

**A. God nodes (3–5 teratas)**

God node = kelas/fungsi paling sentral, jadi hub banyak dependency. Untuk POS,
biasanya ini yang muncul:

- `Order` / `Sale` model — pusat transaksi
- `Cart` service — logika keranjang
- `Product` model — pusat master data
- `StockService` / `InventoryService` — logika stok
- `PaymentService` — orkestrator pembayaran

Catat perannya masing-masing.

**B. Surprise edges (5 teratas)**

Koneksi antar-modul yang tidak terduga. Contoh yang sering muncul di POS:
- `User` terhubung langsung ke `OrderItem` (bukan hanya ke `Order`) —
  desain sengaja untuk track siapa yang menyentuh baris apa
- `Product` terhubung langsung ke `Discount` tanpa lewat `Rule` —
  shortcut yang bisa jadi utang teknis

Catat: mana yang layak ditiru, mana yang jangan ditiru.

**C. Pola arsitektur**

- MVC murni? Modular monolith? Package-based (seperti Bagisto)?
- Pakai Service class? Action class (Spatie style)? Fat model?
- Event-driven? Observer? Command bus?

### 5.2 Buka `graph.html` — jelajahi visual

- Cari cluster: mana modul kasir, mana modul admin, mana modul katalog?
- Cari orphan nodes: kelas yang berdiri sendiri — biasanya utility.
- Cari edge tebal antar-cluster: itu titik ketergantungan kritis.

---

## 6. TULIS `docs/CATATAN-REFERENSI.md`

Buat file dengan struktur berikut. Isi berdasarkan analisis di atas.

```markdown
# CATATAN REFERENSI — POS Laravel Open-Source

Analisis 2 repo referensi menggunakan Graphify, sebagai bahan pertimbangan
arsitektur Skillage Mart POS.

## Repo yang Dipelajari

1. **Bagisto** — https://github.com/bagisto/bagisto
2. **Sale (SamPie)** — https://github.com/SamPie/Sale

## Ringkasan Pola Arsitektur

### Bagisto
- Modular monolith via package (`packages/Webkul/*`)
- Setiap modul: Admin/, Shop/, Repositories/, Models/, Http/, dst
- Service via Repository pattern
- Event-driven untuk beberapa domain (order lifecycle)
- Menggunakan konsep "Data Grid" untuk semua tabel admin

### Sale
- MVC klasik + Service class di app/Services
- Livewire untuk layar kasir
- Fat model dengan sedikit trait

## God Nodes

### Bagisto
1. `Webkul\Sales\Models\Order` — pusat transaksi
2. `Webkul\Product\Models\Product` — master produk kompleks (varian, attribute)
3. `Webkul\Checkout\Cart` — orkestrator keranjang
4. ...

### Sale
1. `App\Models\Sale`
2. `App\Services\SaleService`
3. ...

## Surprise Edges yang Menarik

### Yang layak ditiru
- (isi berdasarkan temuan)

### Yang jangan ditiru
- (isi berdasarkan temuan)

## Pelajaran untuk Skillage Mart

Poin-poin konkret yang akan diterapkan di Skillage Mart:

1. **Pola Service class dari Sale** cocok karena rencana kita sudah pakai
   pendekatan ini (DepositService, StockService, dll).
2. **Pola modular Bagisto TIDAK ditiru** — overkill untuk skala 18 fase kita.
3. **Event-driven untuk journaling** (dari Bagisto) — akan diterapkan di Fase 13
   akuntansi supaya jurnal otomatis dari Observer.
4. **Struktur "Data Grid" Bagisto TIDAK ditiru** — kita pakai TanStack Table
   di React.
5. **Pola order state machine dari Bagisto** akan ditiru untuk sale status
   (draft → hold → completed → void).

## Yang Perlu Diklarifikasi di Grilling (pre-02)

Catatan yang muncul selama analisis, akan ditanyakan saat grilling:
- Apakah kita butuh multi-warehouse seperti Bagisto? (Skillage Mart mungkin
  hanya 1 outlet awal, tapi arsitektur harus siap untuk lebih.)
- Apakah kita butuh konsep "channel" (web vs offline) seperti Bagisto?
  (Storefront kita hanya katalog, tidak ada checkout web.)

## Referensi Kode Spesifik

Bagian kode yang akan dijadikan patokan implementasi:

- **Bagisto `Cart.php`** → referensi cara menghitung ulang total keranjang
  setelah promo/diskon berubah.
- **Sale `SaleService.php`** → referensi pola transaksi DB untuk complete().
- (tambahkan sesuai temuan)
```

---

## 7. TIPS INTERPRETASI

- **Jangan overwhelmed.** Bagisto ratusan file. Fokus ke 3 hal saja: god node
  paling atas, surprise edge yang menarik, pola arsitektur global. Sisanya abaikan.
- **Beda skala tidak apa-apa.** Bagisto skala e-commerce enterprise, Skillage
  Mart skala minimarket sekolah. Pelajari **pola**-nya, bukan skala fitur.
- **Kalau ragu antara "tiru" atau "jangan tiru"**, tunda keputusan. Catat sebagai
  pertanyaan untuk sesi grilling di pre-02.

---

## CHECKLIST VERIFIKASI

- [ ] Graphify ter-install, `graphify --version` bekerja
- [ ] Minimal 1 repo referensi sudah di-clone di `_references/`
- [ ] `_references/` sudah masuk `.gitignore`
- [ ] Graphify sudah dijalankan pada minimal 1 repo, `graphify-out/` terisi
- [ ] `GRAPH_REPORT.md` sudah dibaca, catatan god nodes & surprise edges diambil
- [ ] `graph.html` sudah dijelajah minimal 15 menit
- [ ] `docs/CATATAN-REFERENSI.md` sudah ditulis dengan struktur lengkap
- [ ] Minimal 3 keputusan konkret "layak ditiru" atau "jangan ditiru" tercatat
- [ ] Minimal 2 pertanyaan untuk sesi grilling (pre-02) tercatat

---

**Setelah selesai → lanjut ke `pre-02-grill-requirement.md`.**

**Bila melewati tahap ini:** tetap catat di `docs/CATATAN-REFERENSI.md` satu
baris: *"Tahap ini dilewati karena membangun dari nol. Referensi arsitektur
diambil dari dokumen fase-0 sampai fase-18."*
