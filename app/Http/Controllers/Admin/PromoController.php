<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePromoRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\Promo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PromoController extends Controller
{
    public function index(Request $request): Response
    {
        $promos = Promo::query()
            ->with(['products:id,name', 'categories:id,name'])
            ->when($request->string('type')->toString(), fn ($q, $type) => $q->where('type', $type))
            ->orderByDesc('priority')
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Promos/Index', [
            'tab' => 'promos',
            'promos' => $promos,
            'products' => Product::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'categories' => Category::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only('type'),
        ]);
    }

    public function store(StorePromoRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $productIds = $data['product_ids'] ?? [];
        $categoryIds = $data['category_ids'] ?? [];
        unset($data['product_ids'], $data['category_ids']);

        $promo = Promo::create([...$data, 'created_by' => $request->user()->id]);
        $promo->products()->sync($productIds);
        $promo->categories()->sync($categoryIds);

        return back()->with('success', "Promo \"{$promo->name}\" dibuat.");
    }

    public function update(StorePromoRequest $request, Promo $promo): RedirectResponse
    {
        $data = $request->validated();
        $productIds = $data['product_ids'] ?? [];
        $categoryIds = $data['category_ids'] ?? [];
        unset($data['product_ids'], $data['category_ids']);

        $promo->update($data);
        $promo->products()->sync($productIds);
        $promo->categories()->sync($categoryIds);

        return back()->with('success', "Promo \"{$promo->name}\" diperbarui.");
    }

    public function toggle(Promo $promo): RedirectResponse
    {
        $promo->update(['is_active' => ! $promo->is_active]);

        return back()->with('success', $promo->is_active ? 'Promo diaktifkan.' : 'Promo dinonaktifkan.');
    }

    public function destroy(Promo $promo): RedirectResponse
    {
        $promo->delete();

        return back()->with('success', "Promo \"{$promo->name}\" dihapus.");
    }
}
