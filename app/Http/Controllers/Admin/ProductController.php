<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreProductRequest;
use App\Http\Requests\Admin\UpdateProductRequest;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\Unit;
use App\Services\ProductService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(private readonly ProductService $productService) {}

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
            ->when($request->has('status'), fn ($q) => $q->where('is_active', $request->string('status')->toString() === 'active'))
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        $products->getCollection()->transform(function (Product $product) {
            $product->setAttribute('image_url', $product->images->first()
                ? Storage::disk('public')->url($product->images->first()->path)
                : null);

            return $product;
        });

        // Kolom HPP/margin belum ada di tabel products (dihitung dari
        // stock_layers, Fase 5/13) — belum ada apa pun untuk disaring hari
        // ini. $canViewCost sudah dikirim ke frontend supaya kolom itu bisa
        // langsung disembunyikan/ditampilkan begitu datanya ada nanti.
        return Inertia::render('Admin/Products/Index', [
            'tab' => 'products',
            'products' => $products,
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'brands' => Brand::orderBy('name')->get(['id', 'name']),
            'units' => Unit::where('is_active', true)->orderBy('name')->get(['id', 'code', 'name']),
            'outlets' => Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only('search', 'category_id', 'brand_id', 'status'),
            'canViewCost' => $canViewCost,
            // REVISI-R1-v2.md §4.4 — 3 kartu statistik di atas tabel.
            'stats' => [
                'total' => Product::count(),
                'active' => Product::where('is_active', true)->count(),
                'inactive' => Product::where('is_active', false)->count(),
            ],
        ]);
    }

    public function store(StoreProductRequest $request): RedirectResponse
    {
        $data = $request->safe()->except(['barcodes', 'price']);

        $this->productService->create(
            $data,
            $request->validated('barcodes', []),
            $request->validated('price'),
        );

        return back()->with('success', 'Produk berhasil dibuat.');
    }

    public function update(UpdateProductRequest $request, Product $product): RedirectResponse
    {
        $data = $request->safe()->except(['barcodes']);

        $this->productService->update($product, $data, $request->validated('barcodes', []));

        return back()->with('success', 'Produk berhasil diperbarui.');
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
