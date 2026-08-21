<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StockController extends Controller
{
    public function __construct(private readonly StockService $stockService) {}

    public function index(Request $request): Response
    {
        $outlet = $request->integer('outlet_id')
            ? Outlet::find($request->integer('outlet_id'))
            : Outlet::where('is_main', true)->first();

        $canViewCost = $request->user()->can('product.view_cost');

        $stocks = Stock::query()
            ->join('products', 'products.id', '=', 'stocks.product_id')
            ->with(['product:id,name,sku,min_stock,max_stock,category_id', 'product.category:id,name'])
            ->where('stocks.outlet_id', $outlet?->id)
            ->when($request->string('search')->toString(), fn ($q, $search) => $q->where(
                fn ($sub) => $sub->where('products.name', 'ilike', "%{$search}%")->orWhere('products.sku', 'ilike', "%{$search}%")
            ))
            ->when($request->integer('category_id'), fn ($q, $categoryId) => $q->where('products.category_id', $categoryId))
            ->when($request->string('status')->toString(), function ($q, $status) {
                if ($status === 'out') {
                    $q->where('stocks.qty', '<=', 0);
                } elseif ($status === 'low') {
                    $q->where('stocks.qty', '>', 0)->whereColumn('stocks.qty', '<=', 'products.min_stock');
                }
            })
            ->orderBy('products.name')
            ->select('stocks.*')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Stock/Index', [
            'tab' => 'stock',
            'stocks' => $stocks,
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'outlets' => Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'currentOutletId' => $outlet?->id,
            'expiringSoon' => $outlet ? $this->stockService->getExpiringSoon($outlet, 7)->load('product:id,name') : [],
            'expired' => $outlet ? $this->stockService->getExpired($outlet)->load('product:id,name') : [],
            'filters' => $request->only('search', 'category_id', 'status', 'outlet_id'),
            'canViewCost' => $canViewCost,
        ]);
    }

    public function movements(Request $request, Product $product): JsonResponse
    {
        $outletId = $request->integer('outlet_id') ?: Outlet::where('is_main', true)->value('id');

        $movements = StockMovement::query()
            ->where('product_id', $product->id)
            ->where('outlet_id', $outletId)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get(['reference', 'type', 'qty', 'qty_before', 'qty_after', 'unit_cost', 'note', 'created_at']);

        return response()->json(['movements' => $movements]);
    }
}
