<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Services\StorefrontService;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function __construct(private readonly StorefrontService $storefront) {}

    public function index(): Response
    {
        return Inertia::render('Public/Welcome', [
            'featuredProducts' => $this->storefront->getFeaturedProducts((int) config('storefront.featured_limit', 8)),
            'activePromos' => $this->storefront->getActivePublicPromos()->take(3)->map(fn ($p) => $this->storefront->formatPromoForDisplay($p))->values(),
            'categories' => Category::where('is_active', true)
                ->whereHas('products', fn ($q) => $q->public())
                ->withCount(['products' => fn ($q) => $q->public()])
                ->orderByDesc('products_count')
                ->limit(8)
                ->get(['id', 'name']),
            'contact' => config('storefront.contact'),
        ]);
    }
}
