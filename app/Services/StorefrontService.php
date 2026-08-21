<?php

namespace App\Services;

use App\Data\ProductPublicData;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\Promo;
use App\Models\Stock;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

/**
 * T-111 (Fase 19). Satu-satunya jalan masuk data produk/promo ke
 * storefront publik — SELALU lewat `Product::scopePublic()` +
 * `ProductPublicData` (lihat catatan keamanan di DTO itu).
 *
 * Harga & stok SENGAJA di-batch (satu query utk semua produk di
 * halaman), BUKAN reuse `PriceService::getActivePrice()` per produk
 * — method itu (a) query satu-per-satu (N+1 kalau dipanggil dalam
 * loop katalog, spec Fase 19 eksplisit mensyaratkan "< 10 query" di
 * halaman katalog) dan (b) `throw RuntimeException` kalau harga tidak
 * ditemukan (masuk akal utk checkout, TIDAK masuk akal utk katalog
 * publik — satu produk tanpa harga tidak boleh menjatuhkan seluruh
 * halaman). Badge stok reuse pola T-088 (Phase D) — baca tabel
 * `stocks` (cache teragregasi), bukan `stock_layers`, konsisten
 * dengan dashboard & halaman Stok admin.
 *
 * Cache TTL polos (`config('storefront.cache_ttl_minutes')`), BUKAN
 * invalidasi aktif — MVP sengaja begini (didokumentasikan di
 * docs/tickets/INDEX.md sebagai backlog `CacheInvalidationService`).
 * Konsekuensinya: perubahan produk/harga/promo di admin baru terlihat
 * di storefront setelah cache kedaluwarsa (maks `cache_ttl_minutes`).
 */
class StorefrontService
{
    /**
     * @return Collection<int, ProductPublicData>
     */
    public function getFeaturedProducts(int $limit): Collection
    {
        return Cache::remember("storefront:featured:{$limit}", $this->ttl(), function () use ($limit) {
            $outlet = $this->mainOutlet();

            if ($outlet === null) {
                return collect();
            }

            $products = Product::public()
                ->where('is_favorite', true)
                ->with(['category', 'brand', 'images'])
                ->orderBy('public_order')
                ->orderBy('name')
                ->limit($limit)
                ->get();

            return $this->toPublicDataCollection($products, $outlet);
        });
    }

    /**
     * @param  array{search?: string, category_id?: int, brand_id?: int, sort?: string}  $filters
     */
    public function getCatalog(array $filters, int $perPage): LengthAwarePaginator
    {
        $outlet = $this->mainOutlet();

        $query = Product::public()
            ->with(['category', 'brand', 'images'])
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where('name', 'ilike', "%{$search}%"))
            ->when($filters['category_id'] ?? null, fn ($q, $id) => $q->where('category_id', $id))
            ->when($filters['brand_id'] ?? null, fn ($q, $id) => $q->where('brand_id', $id));

        $query = ($filters['sort'] ?? null) === 'nama'
            ? $query->orderBy('name')
            : $query->orderByDesc('created_at');

        $paginated = $query->paginate($perPage)->withQueryString();
        $data = $this->toPublicDataCollection(collect($paginated->items()), $outlet);

        // Harga tidak ada di tabel products (ada di product_prices per
        // outlet, baru diketahui setelah di-batch di toPublicDataCollection())
        // — sort harga dilakukan di PHP pada satu halaman hasil, bukan di
        // SQL. Cukup untuk skala katalog per-halaman (24 produk/config
        // storefront.products_per_page), tidak butuh subquery harga di SQL.
        if (in_array($filters['sort'] ?? null, ['harga_asc', 'harga_desc'], true)) {
            $data = $data->sortBy(
                fn (ProductPublicData $d) => $d->promoPrice ?? $d->price,
                SORT_REGULAR,
                $filters['sort'] === 'harga_desc',
            )->values();
        }

        $paginated->setCollection($data);

        return $paginated;
    }

    public function getProductDetail(string $slug): ?ProductPublicData
    {
        return Cache::remember("storefront:product:{$slug}", $this->ttl(), function () use ($slug) {
            $outlet = $this->mainOutlet();
            $product = Product::public()->with(['category', 'brand', 'images'])->where('slug', $slug)->first();

            if ($product === null || $outlet === null) {
                return null;
            }

            return $this->toPublicDataCollection(collect([$product]), $outlet)->first();
        });
    }

    /**
     * @return Collection<int, ProductPublicData>
     */
    public function getRelatedProducts(Product $product, int $limit = 4): Collection
    {
        $outlet = $this->mainOutlet();

        if ($outlet === null || $product->category_id === null) {
            return collect();
        }

        $products = Product::public()
            ->with(['category', 'brand', 'images'])
            ->where('category_id', $product->category_id)
            ->where('id', '!=', $product->id)
            ->limit($limit)
            ->get();

        return $this->toPublicDataCollection($products, $outlet);
    }

    /**
     * @return Collection<int, Promo>
     */
    public function getActivePublicPromos(): Collection
    {
        return Cache::remember('storefront:promos', 5, function () {
            $today = now()->toDateString();

            return Promo::query()
                ->where('is_public', true)
                ->where('is_active', true)
                ->where(fn ($q) => $q->whereNull('start_date')->orWhere('start_date', '<=', $today))
                ->where(fn ($q) => $q->whereNull('end_date')->orWhere('end_date', '>=', $today))
                ->with(['products', 'categories'])
                ->orderByDesc('priority')
                ->get();
        });
    }

    /**
     * Promo publik yang BELUM mulai (`start_date` > hari ini) — section
     * terpisah "Segera Hadir" di halaman /promo. Sengaja method
     * terpisah dari getActivePublicPromos() (bukan satu method dengan
     * flag): resolvePromoPrice() HARUS hanya memakai promo yang benar-
     * benar berjalan, tidak boleh tidak sengaja menerapkan harga promo
     * yang belum berlaku kalau kedua daftar digabung.
     *
     * @return Collection<int, Promo>
     */
    public function getUpcomingPublicPromos(): Collection
    {
        return Cache::remember('storefront:promos:upcoming', 5, function () {
            $today = now()->toDateString();

            return Promo::query()
                ->where('is_public', true)
                ->where('is_active', true)
                ->where('start_date', '>', $today)
                ->with(['products', 'categories'])
                ->orderBy('start_date')
                ->get();
        });
    }

    /**
     * Titik tunggal produk model -> DTO publik, dengan harga & stok
     * di-batch SATU query masing-masing untuk seluruh koleksi (bukan
     * per-produk) — lihat catatan performa di docblock kelas.
     *
     * @param  Collection<int, Product>  $products
     * @return Collection<int, ProductPublicData>
     */
    private function toPublicDataCollection(Collection $products, ?Outlet $outlet): Collection
    {
        if ($outlet === null || $products->isEmpty()) {
            return collect();
        }

        $prices = $this->batchPrices($products, $outlet);
        $stocks = $this->batchStocks($products, $outlet);
        $promos = $this->getActivePublicPromos()->filter(fn (Promo $p) => in_array($p->type, ['product', 'category'], true));

        return $products->map(function (Product $product) use ($prices, $stocks, $promos) {
            $price = $prices[$product->id] ?? 0;
            ['price' => $promoPrice, 'label' => $promoLabel] = $this->resolvePromoPrice($product, $price, $promos);
            $qty = $stocks[$product->id] ?? 0.0;

            return new ProductPublicData(
                slug: $product->slug,
                name: $product->name,
                description: $product->description_public,
                category: $product->category?->name,
                brand: $product->brand?->name,
                price: $price,
                promoPrice: $promoPrice,
                promoLabel: $promoLabel,
                stockBadge: $this->stockBadge($qty, (float) $product->min_stock),
                images: (function() use ($product) {
                    if ($product->images->isNotEmpty()) {
                        return $product->images->map(function ($img) {
                            if (str_starts_with($img->path, 'http://') || str_starts_with($img->path, 'https://')) {
                                return $img->path;
                            }
                            $disk = config('filesystems.default', 's3');
                            return Storage::disk($disk)->url($img->path);
                        })->all();
                    }

                    // Fallback gambar default menggunakan logo resmi Skillage Mart
                    return ['/logo/logo2.png'];
                })(),
            );
        })->values();
    }

    /**
     * @param  Collection<int, Product>  $products
     * @return array<int, int> product_id => harga (produk tanpa harga aktif tidak masuk array, bukan error)
     */
    private function batchPrices(Collection $products, Outlet $outlet): array
    {
        $today = now()->toDateString();
        $productIds = $products->pluck('id')->all();

        $rows = ProductPrice::query()
            ->whereIn('product_id', $productIds)
            ->where('outlet_id', $outlet->id)
            ->where('effective_from', '<=', $today)
            ->where(fn ($q) => $q->whereNull('effective_to')->orWhere('effective_to', '>=', $today))
            ->orderByDesc('effective_from')
            ->get()
            ->groupBy('product_id');

        $result = [];

        foreach ($products as $product) {
            $match = ($rows->get($product->id) ?? collect())->firstWhere('unit_id', $product->base_unit_id);

            if ($match !== null) {
                $result[$product->id] = $match->price;
            }
        }

        return $result;
    }

    /**
     * @param  Collection<int, Product>  $products
     * @return array<int, float> product_id => qty
     */
    private function batchStocks(Collection $products, Outlet $outlet): array
    {
        return Stock::whereIn('product_id', $products->pluck('id')->all())
            ->where('outlet_id', $outlet->id)
            ->pluck('qty', 'product_id')
            ->map(fn ($qty) => (float) $qty)
            ->all();
    }

    private function stockBadge(float $qty, float $minStock): string
    {
        if ($qty <= 0) {
            return 'out';
        }

        return $qty <= $minStock ? 'limited' : 'available';
    }

    /**
     * Harga promo untuk TAMPILAN katalog/detail (bukan kalkulasi
     * keranjang sungguhan — itu tetap wewenang PromoEngine saat
     * checkout). Sengaja HANYA promo tipe 'product'/'category' yang
     * dipertimbangkan — tipe lain (buy_x_get_y, bundle, tiered_qty,
     * happy_hour, clearance, member_level, birthday) butuh konteks
     * keranjang/waktu/member yang tidak masuk akal utk satu angka
     * harga statis di katalog publik.
     *
     * @param  Collection<int, Promo>  $candidatePromos  sudah difilter type product/category
     * @return array{price: ?int, label: ?string}
     */
    private function resolvePromoPrice(Product $product, int $basePrice, Collection $candidatePromos): array
    {
        if ($basePrice <= 0) {
            return ['price' => null, 'label' => null];
        }

        $matching = $candidatePromos->first(function (Promo $promo) use ($product) {
            if ($promo->type === 'product') {
                return $promo->products->isEmpty() || $promo->products->contains('id', $product->id);
            }

            return $product->category_id !== null && $promo->categories->contains('id', $product->category_id);
        });

        if ($matching === null) {
            return ['price' => null, 'label' => null];
        }

        $discount = match ($matching->discount_type) {
            'percent' => min((int) round($basePrice * $matching->discount_value / 100), $matching->max_discount ?? PHP_INT_MAX),
            'amount' => min($matching->discount_value, $basePrice),
            'fixed_price' => max(0, $basePrice - $matching->discount_value),
            default => 0,
        };

        $promoPrice = $matching->discount_type === 'fixed_price' ? $matching->discount_value : max(0, $basePrice - $discount);

        return ['price' => $promoPrice, 'label' => $matching->name];
    }

    /**
     * Promo model asli punya field operasional (quota_total,
     * created_by, outlet_ids, dst) yang tidak untuk konsumsi publik —
     * bukan rahasia dagang seperti HPP, tapi tetap tidak pantas
     * dikirim mentah ke browser. Dipakai controller SEBELUM
     * `Inertia::render()`, bukan diformat di React.
     *
     * @return array{code:string,name:string,description:?string,type:string,discount_type:string,discount_value:int,start_date:?string,end_date:?string,products:array<int,array{id:int,slug:string,name:string}>}
     */
    public function formatPromoForDisplay(Promo $promo): array
    {
        return [
            'code' => $promo->code,
            'name' => $promo->name,
            'description' => $promo->description,
            'type' => $promo->type,
            'discount_type' => $promo->discount_type,
            'discount_value' => $promo->discount_value,
            'start_date' => $promo->start_date?->toDateString(),
            'end_date' => $promo->end_date?->toDateString(),
            'products' => $promo->products
                ->filter(fn (Product $p) => $p->is_visible_public && $p->is_active && $p->slug !== null)
                ->map(fn (Product $p) => ['id' => $p->id, 'slug' => $p->slug, 'name' => $p->name])
                ->values()
                ->all(),
        ];
    }

    private function mainOutlet(): ?Outlet
    {
        return Cache::remember('storefront:main-outlet', 60, fn () => Outlet::where('is_main', true)->first());
    }

    private function ttl(): int
    {
        return (int) config('storefront.cache_ttl_minutes', 15);
    }
}
