<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePurchaseOrderRequest;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\Unit;
use App\Services\PurchaseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseOrderController extends Controller
{
    public function __construct(private readonly PurchaseService $purchaseService) {}

    public function index(Request $request): Response
    {
        $orders = PurchaseOrder::query()
            ->with(['supplier:id,name', 'outlet:id,name', 'items'])
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->orderByDesc('order_date')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/PurchaseOrders/Index', [
            'orders' => $orders,
            'suppliers' => Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'outlets' => Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'products' => Product::where('is_active', true)->orderBy('name')->get(['id', 'name', 'sku', 'base_unit_id']),
            'units' => Unit::where('is_active', true)->orderBy('name')->get(['id', 'code', 'name']),
            'filters' => $request->only('status'),
        ]);
    }

    public function store(StorePurchaseOrderRequest $request): RedirectResponse
    {
        $order = $this->purchaseService->createOrder(
            $request->safe()->except('items'),
            $request->validated('items'),
        );

        return back()->with('success', "PO {$order->reference} berhasil dibuat.");
    }

    public function approve(Request $request, PurchaseOrder $purchaseOrder): RedirectResponse
    {
        $this->purchaseService->approveOrder($purchaseOrder, $request->user());

        return back()->with('success', "PO {$purchaseOrder->reference} disetujui.");
    }
}
