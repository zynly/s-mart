<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Services\StorefrontService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(private readonly StorefrontService $storefront) {}

    public function index(Request $request): Response
    {
        // 'sort' SELALU diisi eksplisit (bukan biarkan absen lalu fallback
        // di React) — value Select yang datang dari fallback runtime
        // ('terbaru' via `??`) vs value asli dari props berperilaku beda
        // di Radix Select (soal label awal yang tampil), diamati langsung
        // lewat Playwright saat verifikasi. Lebih aman satu sumber
        // kebenaran di server.
        $filters = [
            ...$request->only(['search', 'category_id', 'brand_id']),
            'sort' => $request->string('sort')->toString() ?: 'terbaru',
        ];

        return Inertia::render('Public/Products', [
            'products' => $this->storefront->getCatalog($filters, (int) config('storefront.products_per_page', 24)),
            'categories' => Category::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'brands' => Brand::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters' => $filters,
        ]);
    }

    public function show(Product $product): Response
    {
        // T-111: scopePublic() adalah pagar keamanan — produk yang tidak
        // lolos (is_visible_public=false, is_active=false, slug null)
        // WAJIB 404, bukan tampil dengan data terbatas. Dicek di sini
        // (bukan cuma di StorefrontService) supaya route model binding
        // yang menemukan produk lewat ID/slug APAPUN tetap tersaring.
        abort_unless(
            Product::public()->whereKey($product->id)->exists(),
            404,
        );

        $detail = $this->storefront->getProductDetail($product->slug);

        abort_if($detail === null, 404);

        return Inertia::render('Public/ProductDetail', [
            'product' => $detail,
            'related' => $this->storefront->getRelatedProducts($product),
        ]);
    }
}
