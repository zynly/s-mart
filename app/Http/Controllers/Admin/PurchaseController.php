<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\InsufficientStockException;
use App\Exceptions\MissingExpiryDateException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePurchaseRequest;
use App\Http\Requests\Admin\StorePurchaseReturnRequest;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Models\Unit;
use App\Services\PurchaseService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseController extends Controller
{
    public function __construct(private readonly PurchaseService $purchaseService) {}

    public function index(Request $request): Response
    {
        $purchases = Purchase::query()
            ->with(['supplier:id,name', 'outlet:id,name'])
            ->when($request->string('search')->toString(), fn ($q, $search) => $q->where(
                fn ($sub) => $sub->where('reference', 'like', "%{$search}%")->orWhere('invoice_no', 'like', "%{$search}%")
            ))
            ->when($request->integer('supplier_id'), fn ($q, $id) => $q->where('supplier_id', $id))
            ->orderByDesc('purchase_date')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Purchases/Index', [
            'tab' => 'purchases',
            'purchases' => $purchases,
            'suppliers' => Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name', 'payment_term_days', 'is_consignor']),
            'outlets' => Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'products' => Product::where('is_active', true)->with('baseUnit:id,code,name')->orderBy('name')->get(['id', 'name', 'sku', 'base_unit_id', 'is_expirable']),
            'units' => Unit::where('is_active', true)->orderBy('name')->get(['id', 'code', 'name']),
            'filters' => $request->only('search', 'supplier_id'),
        ]);
    }

    public function show(Purchase $purchase): Response
    {
        return Inertia::render('Admin/Purchases/Show', [
            'purchase' => $purchase->load(['supplier', 'outlet', 'items.product:id,name,sku', 'otherCosts', 'debt']),
        ]);
    }

    public function store(StorePurchaseRequest $request): RedirectResponse
    {
        try {
            $purchase = $this->purchaseService->receive(
                $request->safe()->except(['items', 'other_costs']),
                $request->validated('items'),
                $request->validated('other_costs', []),
            );
        } catch (MissingExpiryDateException $e) {
            throw ValidationException::withMessages(['items' => $e->getMessage()]);
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['items' => $e->getMessage()]);
        }

        return redirect()->route('admin.purchases.show', $purchase)->with('success', "Pembelian {$purchase->reference} berhasil dicatat.");
    }

    public function storeReturn(StorePurchaseReturnRequest $request): RedirectResponse
    {
        try {
            $return = $this->purchaseService->processReturn(
                $request->safe()->except('items'),
                $request->validated('items'),
            );
        } catch (InsufficientStockException $e) {
            throw ValidationException::withMessages(['items' => $e->getMessage()]);
        }

        return back()->with('success', "Retur pembelian {$return->reference} berhasil.");
    }

    public function items(Purchase $purchase)
    {
        return response()->json([
            'items' => PurchaseItem::where('purchase_id', $purchase->id)->with('product:id,name')->get(),
        ]);
    }
}
