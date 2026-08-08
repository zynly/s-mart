<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreProductRequest;
use App\Http\Requests\Admin\UpdateProductPriceRequest;
use App\Http\Requests\Admin\UpdateProductRequest;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\Unit;
use App\Services\PriceService;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(
        private readonly ProductService $productService,
        private readonly PriceService $priceService,
    ) {}

    public function index(Request $request): Response
    {
        $canViewCost = $request->user()->can('product.view_cost');

        $products = Product::query()
            ->with([
                'category:id,name', 'brand:id,name', 'baseUnit:id,code', 'barcodes',
                'prices' => fn ($q) => $q->whereNull('effective_to'),
                // REVISI-R1-v2.md §4.5 — thumbnail di kolom pertama tabel.
                'images' => fn ($q) => $q->where('is_primary', true)->limit(1),
            ])
            ->when($request->string('search')->toString(), fn ($q, $search) => $q->where(
                fn ($sub) => $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhereHas('barcodes', fn ($b) => $b->where('barcode', 'like', "%{$search}%"))
            ))
            ->when($request->integer('category_id'), fn ($q, $categoryId) => $q->where('category_id', $categoryId))
            ->when($request->integer('brand_id'), fn ($q, $brandId) => $q->where('brand_id', $brandId))
            ->when($request->has('is_favorite') && $request->string('is_favorite')->toString() !== '', fn ($q) => $q->where('is_favorite', $request->boolean('is_favorite')))
            ->when($request->has('status') && $request->string('status')->toString() !== '', fn ($q) => $q->where('is_active', $request->string('status')->toString() === 'active'))
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        $products->getCollection()->transform(function (Product $product) {
            $firstImage = $product->images->first();
            $url = null;
            if ($firstImage && $firstImage->path) {
                if (str_starts_with($firstImage->path, 'http://') || str_starts_with($firstImage->path, 'https://')) {
                    $url = $firstImage->path;
                } else {
                    $disk = config('filesystems.default', 'public');
                    $url = Storage::disk($disk)->url($firstImage->path);
                }
            }
            $product->setAttribute('image_url', $url);

            return $product;
        });

        return Inertia::render('Admin/Products/Index', [
            'tab' => 'products',
            'products' => $products,
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'brands' => Brand::orderBy('name')->get(['id', 'name']),
            'units' => Unit::where('is_active', true)->orderBy('name')->get(['id', 'code', 'name']),
            'outlets' => Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only('search', 'category_id', 'brand_id', 'status', 'is_favorite'),
            'canViewCost' => $canViewCost,
            'stats' => [
                'total' => Product::count(),
                'active' => Product::where('is_active', true)->count(),
                'inactive' => Product::where('is_active', false)->count(),
                'favorite' => Product::where('is_favorite', true)->count(),
            ],
        ]);
    }

    public function show(Product $product): Response
    {
        $product->load([
            'category:id,name',
            'brand:id,name',
            'baseUnit:id,code,name',
            'barcodes.unit:id,code,name',
            'prices.outlet:id,name',
            'prices.unit:id,code,name',
            'images',
        ]);

        $disk = config('filesystems.default', 'public');
        $formattedImages = $product->images->map(function ($img) use ($disk) {
            $url = (str_starts_with($img->path, 'http://') || str_starts_with($img->path, 'https://'))
                ? $img->path
                : Storage::disk($disk)->url($img->path);

            return [
                'id' => $img->id,
                'url' => $url,
                'alt' => $img->alt,
                'is_primary' => $img->is_primary,
            ];
        });

        return Inertia::render('Admin/Products/Show', [
            'product' => array_merge($product->toArray(), [
                'formatted_images' => $formattedImages,
            ]),
        ]);
    }

    public function uploadImage(Request $request, Product $product): RedirectResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpeg,png,jpg,webp,svg', 'max:5120'],
            'alt'   => ['nullable', 'string', 'max:255'],
        ]);

        $disk = config('filesystems.default', 'public');

        try {
            $path = $request->file('image')->store('products', $disk);
        } catch (\Throwable $e) {
            Log::error('Upload gambar produk gagal', [
                'product_id' => $product->id,
                'disk'       => $disk,
                'error'      => $e->getMessage(),
            ]);

            return back()->withErrors([
                'image' => 'Gagal mengunggah foto ke storage: '.$e->getMessage(),
            ]);
        }

        if (! $path) {
            return back()->withErrors(['image' => 'Gagal mengunggah foto, coba lagi.']);
        }

        $isPrimary = $product->images()->count() === 0;

        $product->images()->create([
            'path'       => $path,
            'alt'        => $request->input('alt') ?: $product->name,
            'sort_order' => $product->images()->count() + 1,
            'is_primary' => $isPrimary,
        ]);

        return back()->with('success', 'Foto produk berhasil diunggah ke storage.');
    }

    public function deleteImage(Product $product, \App\Models\ProductImage $image): RedirectResponse
    {
        if ($image->product_id !== $product->id) {
            abort(404);
        }

        $disk = config('filesystems.default', 'public');
        if (! str_starts_with($image->path, 'http')) {
            Storage::disk($disk)->delete($image->path);
        }

        $wasPrimary = $image->is_primary;
        $image->delete();

        if ($wasPrimary) {
            $product->images()->first()?->update(['is_primary' => true]);
        }

        return back()->with('success', 'Foto produk berhasil dihapus.');
    }

    public function setPrimaryImage(Product $product, \App\Models\ProductImage $image): RedirectResponse
    {
        if ($image->product_id !== $product->id) {
            abort(404);
        }

        $product->images()->update(['is_primary' => false]);
        $image->update(['is_primary' => true]);

        return back()->with('success', 'Foto utama produk berhasil diperbarui.');
    }

    public function toggleFavorite(Product $product): RedirectResponse
    {
        $product->update(['is_favorite' => ! $product->is_favorite]);

        $message = $product->is_favorite ? "{$product->name} ditandai sebagai favorit." : "Tanda favorit {$product->name} dihapus.";

        return back()->with('success', $message);
    }

    public function addBarcode(Request $request, Product $product): RedirectResponse
    {
        $data = $request->validate([
            'barcode' => ['nullable', 'string', 'max:50'],
            'unit_id' => ['required', 'exists:units,id'],
            'is_primary' => ['nullable', 'boolean'],
        ]);

        $barcode = trim($data['barcode'] ?? '');

        if ($barcode === '') {
            do {
                $base = '899' . str_pad((string) mt_rand(1, 99999999), 8, '0', STR_PAD_LEFT);
                $checksum = 0;
                for ($i = 0; $i < 11; $i++) {
                    $checksum += (int) $base[$i] * ($i % 2 === 0 ? 1 : 3);
                }
                $checkDigit = (10 - ($checksum % 10)) % 10;
                $barcode = $base . $checkDigit;
            } while (\App\Models\ProductBarcode::where('barcode', $barcode)->exists());
        } else {
            if (\App\Models\ProductBarcode::where('barcode', $barcode)->where('product_id', '!=', $product->id)->exists()) {
                throw ValidationException::withMessages([
                    'barcode' => "Barcode {$barcode} sudah digunakan oleh produk lain.",
                ]);
            }
        }

        $isPrimary = $request->boolean('is_primary') || $product->barcodes()->count() === 0;

        if ($isPrimary) {
            $product->barcodes()->update(['is_primary' => false]);
        }

        $product->barcodes()->updateOrCreate(
            ['product_id' => $product->id, 'barcode' => $barcode],
            [
                'unit_id' => $data['unit_id'],
                'is_primary' => $isPrimary,
            ]
        );

        return back()->with('success', "Barcode \"{$barcode}\" berhasil ditambahkan ke {$product->name}.");
    }

    public function deleteBarcode(Product $product, \App\Models\ProductBarcode $barcode): RedirectResponse
    {
        if ($barcode->product_id !== $product->id) {
            abort(404);
        }

        $code = $barcode->barcode;
        $wasPrimary = $barcode->is_primary;
        $barcode->delete();

        if ($wasPrimary) {
            $product->barcodes()->first()?->update(['is_primary' => true]);
        }

        return back()->with('success', "Barcode \"{$code}\" berhasil dihapus.");
    }

    public function checkBarcode(Request $request): JsonResponse
    {
        $barcode = trim((string) $request->query('barcode'));
        $excludeProductId = $request->query('exclude_product_id');

        if ($barcode === '') {
            return response()->json(['valid' => false, 'message' => 'Kode barcode tidak boleh kosong.']);
        }

        $query = ProductBarcode::where('barcode', $barcode)->with('product');
        if ($excludeProductId) {
            $query->where('product_id', '!=', $excludeProductId);
        }
        $existing = $query->first();

        if ($existing) {
            return response()->json([
                'valid' => false,
                'message' => "Barcode \"{$barcode}\" sudah terdaftar pada produk \"{$existing->product->name}\" (SKU: {$existing->product->sku}).",
                'product' => [
                    'id' => $existing->product->id,
                    'name' => $existing->product->name,
                    'sku' => $existing->product->sku,
                ],
            ]);
        }

        return response()->json([
            'valid' => true,
            'message' => "Barcode \"{$barcode}\" tersedia dan belum digunakan.",
        ]);
    }

    public function store(StoreProductRequest $request): RedirectResponse
    {
        $data = $request->safe()->except(['barcodes', 'price']);

        $product = $this->productService->create(
            $data,
            $request->validated('barcodes', []),
            $request->validated('price'),
        );

        return back()->with([
            'success'        => 'Produk berhasil dibuat.',
            'new_product_id' => $product->id,
        ]);
    }

    public function update(UpdateProductRequest $request, Product $product): RedirectResponse
    {
        $data = $request->safe()->except(['barcodes']);

        $this->productService->update($product, $data, $request->validated('barcodes', []));

        return back()->with('success', 'Produk berhasil diperbarui.');
    }

    /**
     * Gap ditemukan: `PriceService::changePrice()` hanya pernah dipanggil
     * dari `ProductService::create()` (harga AWAL saat produk dibuat) —
     * tidak ada satu pun jalur untuk MENGUBAH harga produk yang sudah
     * ada. `product_prices` immutable (lihat komentar `PriceService`):
     * "ubah harga" = tutup baris lama (`effective_to`) + insert baris
     * baru, bukan UPDATE — persis yang dilakukan `changePrice()`.
     */
    public function updatePrice(UpdateProductPriceRequest $request, Product $product): RedirectResponse
    {
        $data = $request->validated();

        $this->priceService->changePrice(
            $product,
            Outlet::findOrFail($data['outlet_id']),
            Unit::findOrFail($data['unit_id']),
            $data['price'],
            $data['effective_from'] ?? now()->toDateString(),
            $data['member_price'] ?? null,
        );

        return back()->with('success', 'Harga produk berhasil diperbarui.');
    }

    /**
     * REVISI-R1-v2.md §4.3 — produk terkait transaksi historis; hard/soft
     * delete merusak integritas laporan (relasi `product` di baris nota
     * lama jadi hilang). Satu-satunya jalan resmi menonaktifkan produk
     * sekarang HANYA lewat form Ubah (`is_active` toggle) — endpoint ini
     * sengaja diblokir, bukan dihapus dari routes, supaya link lama
     * (bookmark/integrasi) mendapat error yang jelas, bukan 404 generik.
     */
    public function destroy(Product $product): RedirectResponse
    {
        abort(403, 'Produk tidak bisa dihapus — nonaktifkan lewat form Ubah Produk.');
    }
}
