# FASE 19 — STOREFRONT PUBLIK (KATALOG)

> **Konteks global di `README-v2.md`. Perbaikan wajib di
> `CATATAN-PERBAIKAN.md`.**

**Target:** website publik yang menampilkan katalog produk Skillage Mart —
seperti alfamart.co.id atau superindo.co.id, tapi **tanpa belanja online**.
Data diambil langsung dari database POS.

**Prasyarat:** Fase 0, UI-01, 2 (master data), 5 (stok), 10 (promo) selesai.
**Estimasi:** 1 sesi (2–4 jam).

**Fase BARU** — tidak ada di rencana 18 fase asli.

---

```
=== FASE 19: STOREFRONT PUBLIK ===
Fase 0–15 dan UI-01 sudah selesai.

KONTEKS: Ini website publik yang bisa diakses siapa saja tanpa login.
Fungsinya seperti brosur digital — pengunjung lihat produk & harga,
TIDAK BISA checkout. Tujuan: transparansi harga untuk wali santri,
branding sekolah, dan pintu masuk ke Portal Wali.

BATASAN TEGAS (ini BUKAN toko online):
- TIDAK ADA keranjang belanja
- TIDAK ADA checkout / pembayaran produk
- TIDAK ADA pengiriman / kurir
- TIDAK ADA wishlist / akun pembeli
Yang ADA: katalog, pencarian, filter, detail produk, promo, info toko.

──────────────────────────────────────────────────────────────
1. PRASYARAT DATA (dari Fase 2)
──────────────────────────────────────────────────────────────

Kolom yang HARUS sudah ada di tabel products (dari CATATAN-PERBAIKAN):
  is_visible_public  (bool, default false)
  slug               (unique, nullable)
  description_public (text, nullable)
  public_order       (int, nullable)

Tabel product_images sudah ada (multi-gambar).
Tabel promos punya kolom is_public (dari Fase 10).

Bila belum ada, buat migration tambahan di fase ini — JANGAN edit
migration lama.

──────────────────────────────────────────────────────────────
2. ATURAN TAMPILAN PUBLIK
──────────────────────────────────────────────────────────────

YANG DITAMPILKAN:
  ✓ Nama produk
  ✓ Foto produk (dari product_images, primary dulu)
  ✓ Harga jual normal (dari PriceService, outlet utama)
  ✓ Harga promo bila ada (dengan strikethrough harga lama)
  ✓ Kategori & brand
  ✓ Deskripsi publik (description_public)
  ✓ Badge ketersediaan: "Tersedia" / "Habis" / "Stok Terbatas"
  ✓ Badge promo bila produk sedang diskon

YANG TIDAK DITAMPILKAN (RAHASIA DAGANG):
  ✗ Angka stok persis (hanya badge)
  ✗ HPP / unit_cost / margin
  ✗ Supplier
  ✗ Batch / expired date
  ✗ SKU internal (kecuali diputuskan lain)
  ✗ Produk dengan is_visible_public = false
  ✗ Produk is_active = false
  ✗ Produk konsinyasi? (KEPUTUSAN: tampilkan, karena tetap dijual
    di toko. Tapi tidak diberi tanda konsinyasi.)

ATURAN BADGE STOK (config/storefront.php):
  qty = 0              → "Habis"       (badge danger, produk tetap
                          tampil tapi buram + tidak bisa diklik detail?
                          KEPUTUSAN: tetap bisa diklik, ada info
                          "sedang kosong")
  qty ≤ min_stock      → "Stok Terbatas" (badge warning)
  qty > min_stock      → "Tersedia"    (badge success)

──────────────────────────────────────────────────────────────
3. HALAMAN
──────────────────────────────────────────────────────────────

3.1 BERANDA — /

Layout: PublicLayout

Bagian dari atas ke bawah:

a) Hero
   - Judul: "Skillage Mart"
   - Subjudul: "Minimarket SMK Skill Village Islamic School"
   - Deskripsi singkat 1-2 kalimat
   - Dua tombol: [Lihat Produk] [Portal Wali]
   - Background: gradien navy dengan pola halus

b) Promo Berjalan (bila ada promo is_public=true & aktif)
   - Carousel shadcn atau grid 2-3 kartu
   - Setiap kartu: nama promo, deskripsi, periode, tombol
     "Lihat Produk"
   - Sembunyikan seluruh section bila tidak ada promo aktif

c) Kategori Pilihan
   - Grid ikon kategori (6-8 kategori teratas)
   - Klik → /produk?kategori=slug

d) Produk Pilihan
   - Grid 4 kolom desktop, 2 kolom mobile
   - Ambil dari products where is_favorite=true AND is_visible_public=true
   - Limit dari config storefront.featured_limit (default 8)
   - Tombol "Lihat Semua Produk" di bawah

e) Informasi Toko
   - 3 kartu: Jam Buka · Lokasi · Kontak
   - Ikon lucide untuk masing-masing

f) Ajakan Portal Wali
   - Banner: "Wali santri? Pantau saldo & belanja anak Anda"
   - Tombol → /wali/login

3.2 KATALOG — /produk

Layout: PublicLayout

Fitur:
- Pencarian (nama produk) — debounce 300ms, update URL query
- Filter kategori (dropdown atau chip)
- Filter brand (dropdown)
- Sort: Terbaru · Nama A-Z · Harga Terendah · Harga Tertinggi
- Grid produk 4 kolom (desktop), 3 (tablet), 2 (mobile)
- Pagination (config: 24 per halaman)
- Skeleton loading saat pindah halaman

Setiap kartu produk (<ProductCardPublic>):
  - Foto (aspect-square, object-cover, lazy loading)
  - Badge promo di pojok kiri atas (bila ada)
  - Badge stok di pojok kanan atas
  - Nama produk (2 baris, truncate)
  - Kategori (teks kecil, muted)
  - Harga: bila promo → harga lama strikethrough + harga baru
    Bila tidak → harga normal
  - Klik seluruh kartu → detail produk

State filter disimpan di URL query (bukan React state) supaya:
  - Bisa di-bookmark & dibagikan
  - Tombol back browser bekerja
  - SEO friendly

Implementasi: Inertia router.get dengan preserveState & replace.

3.3 DETAIL PRODUK — /produk/{slug}

Layout: PublicLayout

Bagian:
- Breadcrumb: Beranda > Produk > Kategori > Nama Produk
- Grid 2 kolom (desktop):
  Kiri: galeri gambar (ProductGallery — thumbnail + gambar besar)
  Kanan:
    - Nama produk (h1)
    - Kategori & brand (badge)
    - Harga besar (dengan promo bila ada)
    - Badge ketersediaan
    - Deskripsi publik
    - Info: "Tersedia di Skillage Mart, SMK Skill Village Islamic
      School, Jonggol"
    - Catatan: "Harga dapat berubah sewaktu-waktu. Silakan cek
      langsung di toko."
- Produk Serupa (4 produk dari kategori sama)

Meta tags untuk SEO & social sharing:
  <title>{nama} - Skillage Mart</title>
  <meta name="description" content="{description_public truncated}">
  <meta property="og:title" ...>
  <meta property="og:image" content="{primary image url}">
  <meta property="og:type" content="product">

Pakai <Head> dari @inertiajs/react.

3.4 PROMO — /promo

Layout: PublicLayout

- Daftar semua promo dengan is_public=true dan sedang aktif
  (start_date ≤ hari ini ≤ end_date)
- Setiap promo: nama, deskripsi, periode, jenis diskon
- Bila promo terkait produk tertentu → tampilkan grid produknya
- Promo yang akan datang: section terpisah "Segera Hadir"
- Bila tidak ada promo → EmptyState "Belum ada promo saat ini"

3.5 TENTANG — /tentang

Layout: PublicLayout
Konten statis (bisa diedit dari Pengaturan di Fase 17):
- Profil Skillage Mart
- Kaitan dengan SMK Skill Village Islamic School
- Nilai FAST (Fathonah, Amanah, Siddiq, Tabligh)
- Konsep TEFA / technopreneur
- Foto toko (bila ada)

3.6 KONTAK — /kontak

Layout: PublicLayout
- Alamat lengkap + peta (embed Google Maps atau gambar statis)
- Nomor telepon / WhatsApp (tombol langsung chat)
- Email
- Jam operasional
- Form kontak sederhana: nama, email/HP, pesan
  → simpan ke tabel `feedbacks` (sudah ada di Fase 17) dengan
    type='contact'
  → rate limit 3x/jam per IP
  → honeypot field untuk anti-bot (JANGAN pakai CAPTCHA)

3.7 FAQ — /faq

Layout: PublicLayout
Accordion shadcn dengan pertanyaan umum:
- Bagaimana cara top-up saldo anak saya?
- Apakah saya bisa membatasi belanja anak?
- Kartu anak hilang, bagaimana?
- Apakah saldo hangus saat anak lulus?
- Bagaimana cara melihat riwayat belanja?
- dst.

Konten bisa dikelola dari Pengaturan (Fase 17) atau hardcode dulu.

3.8 CEK SALDO — /cek-saldo

Sudah dibuat di Fase 3. Pastikan pakai PublicLayout dan konsisten
dengan desain storefront.

──────────────────────────────────────────────────────────────
4. BACKEND
──────────────────────────────────────────────────────────────

Controllers (app/Http/Controllers/Public/):
  HomeController@index
  ProductController@index    → katalog dengan filter
  ProductController@show     → detail by slug
  PromoController@index
  PageController@about, @contact, @faq
  ContactController@store    → simpan pesan

Routes (routes/web.php, grup tanpa auth):
  Route::get('/', [HomeController::class, 'index'])->name('home');
  Route::get('/produk', [ProductController::class, 'index'])->name('produk.index');
  Route::get('/produk/{product:slug}', [ProductController::class, 'show'])->name('produk.show');
  Route::get('/promo', [PromoController::class, 'index'])->name('promo.index');
  Route::get('/tentang', ...)->name('tentang');
  Route::get('/kontak', ...)->name('kontak');
  Route::post('/kontak', [ContactController::class, 'store'])
      ->middleware('throttle:3,60')->name('kontak.store');
  Route::get('/faq', ...)->name('faq');

Service: app/Services/StorefrontService.php
  getFeaturedProducts(int $limit): Collection
  getCatalog(array $filters, int $perPage): LengthAwarePaginator
  getProductDetail(string $slug): ?ProductPublicData
  getRelatedProducts(Product $p, int $limit): Collection
  getActivePublicPromos(): Collection
  getStockBadge(Product $p): string  // 'available'|'limited'|'out'

DTO (app/Data/):
  ProductPublicData — HANYA field yang boleh publik.
  Ini lapisan keamanan penting: dengan DTO, tidak mungkin tidak
  sengaja mengirim HPP ke React.

  class ProductPublicData extends Data {
    public function __construct(
      public string $slug,
      public string $name,
      public ?string $description,
      public string $category,
      public ?string $brand,
      public int $price,
      public ?int $promoPrice,
      public ?string $promoLabel,
      public string $stockBadge,       // 'available'|'limited'|'out'
      public array $images,             // url saja
    ) {}
  }

  JANGAN pakai ProductResource biasa atau $product->toArray().

Global scope untuk keamanan:
  Di StorefrontService, SELALU filter:
    ->where('is_visible_public', true)
    ->where('is_active', true)
    ->whereNotNull('slug')

  Buat query scope di model Product:
    public function scopePublic(Builder $q): Builder {
      return $q->where('is_visible_public', true)
               ->where('is_active', true)
               ->whereNotNull('slug');
    }

──────────────────────────────────────────────────────────────
5. PERFORMA (PENTING UNTUK SHARED HOSTING)
──────────────────────────────────────────────────────────────

Storefront adalah halaman yang paling sering diakses dan paling
tidak sering berubah. WAJIB di-cache agresif.

CACHE:
- Featured products: cache 15 menit (config storefront.cache_ttl_minutes)
- Kategori list: cache 60 menit
- Promo aktif: cache 5 menit
- Detail produk: cache 15 menit per slug
- Invalidate cache saat: produk diubah, harga diubah, promo diubah,
  stok berubah signifikan

Implementasi: Cache::remember() dengan driver database (bukan Redis).
Tag cache tidak tersedia di database driver — pakai key prefix manual:
  storefront:featured
  storefront:catalog:{hash-filter}
  storefront:product:{slug}
  storefront:promos

Buat CacheInvalidationService dengan method:
  flushStorefront(): void       ← hapus semua key prefix storefront:
  flushProduct(string $slug): void

Panggil dari Observer Product, ProductPrice, Promo.

GAMBAR:
- Resize saat upload (Fase 2): thumbnail 400×400, detail 800×800
- Format WebP dengan fallback JPEG
- Lazy loading: loading="lazy" pada <img>
- Placeholder: blur hash atau skeleton

QUERY:
- Eager load: category, brand, images, activePrice
- Hindari N+1 — pasang Laravel Debugbar saat dev, cek query count
  di halaman katalog (target: < 10 query)
- Index: products(is_visible_public, is_active, category_id)

──────────────────────────────────────────────────────────────
6. SEO
──────────────────────────────────────────────────────────────

- Sitemap XML: /sitemap.xml
  Generate via command `php artisan sitemap:generate`, jadwalkan
  harian. Isi: beranda, /produk, semua /produk/{slug}, /promo,
  /tentang, /kontak, /faq
- robots.txt: allow semua kecuali /admin, /pos, /wali
- Meta description unik per halaman
- Open Graph tags untuk sharing WhatsApp/Facebook
- Structured data (JSON-LD) untuk produk:
  @type: Product, name, image, description, offers.price,
  offers.priceCurrency: IDR, offers.availability
- Canonical URL
- Heading hierarchy benar (satu h1 per halaman)

Catatan: SEO relevan bila storefront dibuka publik penuh. Kalau
nanti diputuskan tertutup (hanya wali), SEO tidak perlu.

──────────────────────────────────────────────────────────────
7. KOMPONEN REACT BARU
──────────────────────────────────────────────────────────────

resources/js/Components/public/:

<ProductCardPublic product />
  → Kartu produk untuk grid katalog

<ProductGallery images />
  → Thumbnail kiri/bawah + gambar besar, klik untuk zoom

<PriceDisplay price promoPrice />
  → Harga dengan strikethrough bila ada promo

<StockBadge status />
  → Badge Tersedia/Terbatas/Habis

<CategoryChips categories active onChange />
  → Filter kategori berbentuk chip

<PromoCard promo />
  → Kartu promo di beranda & halaman promo

<PublicHero />
  → Hero beranda

<InfoCard icon title content />
  → Kartu info (jam buka, lokasi, kontak)

resources/js/Pages/Public/:
  Home.tsx
  Products.tsx
  ProductDetail.tsx
  Promos.tsx
  About.tsx
  Contact.tsx
  Faq.tsx
  CheckBalance.tsx    (dari Fase 3, pindahkan ke sini)

──────────────────────────────────────────────────────────────
8. ADMIN: KELOLA STOREFRONT
──────────────────────────────────────────────────────────────

Tambahkan ke halaman Produk (/admin/produk) di Fase 2:
- Kolom baru di DataTable: "Publik" (switch on/off)
- Bulk action: "Tampilkan di Storefront" / "Sembunyikan dari Storefront"
- Di form produk, tab baru "Storefront":
  * Switch: Tampilkan di storefront
  * Input: Slug (auto-generate dari nama, bisa diedit)
  * Textarea: Deskripsi publik
  * Input: Urutan tampil (public_order)
  * Preview: bagaimana produk tampil di katalog

Tambahkan ke Pengaturan (Fase 17) tab baru "Storefront":
  * Tampilkan harga? (on/off)
  * Tampilkan badge stok? (on/off)
  * Jumlah produk per halaman
  * Jumlah produk pilihan di beranda
  * Teks hero (judul, subjudul, deskripsi)
  * Konten Tentang (rich text)
  * Konten FAQ (repeatable: pertanyaan + jawaban)
  * Jam operasional
  * Kontak (telepon, WA, email)
  * Link media sosial

──────────────────────────────────────────────────────────────
CHECKLIST VERIFIKASI
──────────────────────────────────────────────────────────────

KEAMANAN (PALING PENTING)
□ Buka /produk → produk dengan is_visible_public=false TIDAK MUNCUL
□ Buka /produk/{slug} produk yang is_visible_public=false → 404
□ Inspect Network tab di browser → response JSON dari Inertia
  TIDAK MENGANDUNG: unit_cost, avg_cost, hpp, margin, supplier_id,
  batch_no, expired_at, qty (angka stok persis)
□ Produk is_active=false tidak muncul
□ Form kontak: submit 4x dalam sejam → yang ke-4 ditolak (rate limit)
□ Honeypot field terisi → submit ditolak diam-diam

FUNGSIONAL
□ Beranda tampil: hero, promo (bila ada), kategori, produk pilihan,
  info toko, ajakan portal wali
□ /produk: pencarian bekerja, filter kategori bekerja, sort bekerja
□ Filter tersimpan di URL → refresh tetap terfilter
□ Tombol back browser mengembalikan filter sebelumnya
□ Pagination bekerja
□ Klik produk → detail tampil dengan galeri
□ Produk dengan promo → harga lama strikethrough, harga baru menonjol
□ Produk habis → badge "Habis", tetap bisa dibuka detailnya
□ /promo: promo is_public=true tampil, is_public=false tidak
□ /kontak: submit pesan → tersimpan di tabel feedbacks

TAMPILAN
□ Responsif: 320px (HP kecil), 768px (tablet), 1440px (desktop)
□ Mode gelap bekerja di semua halaman publik
□ Gambar lazy loading (cek Network tab: gambar bawah baru load
  saat di-scroll)
□ Skeleton muncul saat pindah halaman katalog
□ Tidak ada layout shift (CLS) saat gambar load

PERFORMA
□ Halaman katalog: < 10 query database (cek Debugbar)
□ Cache bekerja: buka /produk 2x → kedua kali lebih cepat,
  query lebih sedikit
□ Ubah produk di admin → cache ter-invalidate, perubahan terlihat
  di storefront
□ Lighthouse score (mode dev, target kasar):
  Performance > 80, Accessibility > 90, SEO > 90

SEO
□ /sitemap.xml ada dan valid
□ /robots.txt memblokir /admin, /pos, /wali
□ View source halaman produk → meta description, og:title,
  og:image ada
□ Structured data valid (uji di search.google.com/test/rich-results)
□ Satu h1 per halaman

ADMIN
□ Toggle "Publik" di daftar produk bekerja
□ Bulk action tampilkan/sembunyikan bekerja
□ Tab Storefront di form produk bekerja
□ Slug auto-generate dari nama, unik, bisa diedit
□ Slug duplikat → validasi menolak

Setelah semua lolos → commit:
  git commit -m "Fase 19: storefront publik katalog"
```

---

## CATATAN UNTUK ZIYAD

**Yang paling berisiko di fase ini: kebocoran data internal.**

Karena storefront memakai database yang sama dengan POS, satu kesalahan
di controller bisa mengirim HPP atau angka stok ke publik. Ini bukan
teoretis — kesalahan paling umum adalah `return Inertia::render('...',
['products' => $products])` tanpa DTO.

**Pertahanan berlapis yang saya sarankan:**

1. **DTO wajib** (`ProductPublicData`) — hanya field yang boleh publik
2. **Scope `public()`** di model — tidak mungkin lupa filter
3. **Test otomatis** yang memeriksa response tidak mengandung
   kata "cost", "hpp", "margin", "supplier"

Test ini masuk ke Fase 18:

```php
it('tidak membocorkan data internal di storefront', function () {
    $product = Product::factory()->create([
        'is_visible_public' => true,
    ]);

    $response = $this->get("/produk/{$product->slug}");
    $json = json_encode($response->viewData('page') ?? []);

    expect($json)
        ->not->toContain('unit_cost')
        ->not->toContain('avg_cost')
        ->not->toContain('supplier_id')
        ->not->toContain('batch_no');
});
```

**Keputusan yang perlu Pak ambil saat mengerjakan fase ini:**

1. **Apakah SKU ditampilkan?** Saya cenderung tidak — tidak berguna
   untuk wali, dan memudahkan kompetitor memetakan katalog.
2. **Apakah produk konsinyasi ditandai?** Saya cenderung tidak —
   dari sisi pembeli tidak relevan.
3. **Apakah storefront benar-benar publik atau butuh login?** Kalau
   nanti berubah jadi tertutup, seluruh bagian SEO bisa dilewati.

---

*Fase 19 — Skillage Mart POS*
