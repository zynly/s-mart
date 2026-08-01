<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreStockAdjustmentRequest;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\StockLayer;
use App\Services\StockAdjustmentService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class StockAdjustmentController extends Controller
{
    public function __construct(private readonly StockAdjustmentService $adjustmentService) {}

    public function index(Request $request): Response
    {
        $adjustments = StockAdjustment::query()
            ->with(['outlet:id,name', 'requester:id,name', 'approver:id,name', 'items.product:id,name'])
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/StockAdjustments/Index', [
            'tab' => 'stock-adjustments',
            'adjustments' => $adjustments,
            'products' => Product::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'outlets' => Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only('status'),
        ]);
    }

    public function layers(Request $request, Product $product): JsonResponse
    {
        $outletId = $request->integer('outlet_id');

        $layers = StockLayer::where('product_id', $product->id)
            ->where('outlet_id', $outletId)
            ->where('qty_remaining', '>', 0)
            ->orderByRaw('(expired_at IS NULL) ASC, expired_at ASC, received_at ASC')
            ->get(['id', 'batch_no', 'expired_at', 'qty_remaining', 'unit_cost']);

        return response()->json(['layers' => $layers]);
    }

    public function store(StoreStockAdjustmentRequest $request): RedirectResponse
    {
        try {
            $adjustment = $this->adjustmentService->request($request->validated(), $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['items' => $e->getMessage()]);
        }

        return back()->with('success', "Pengajuan penyesuaian {$adjustment->reference} dibuat.");
    }

    public function approve(Request $request, StockAdjustment $stockAdjustment): RedirectResponse
    {
        try {
            $this->adjustmentService->approve($stockAdjustment, $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return back()->with('success', "Penyesuaian {$stockAdjustment->reference} disetujui.");
    }

    public function post(StockAdjustment $stockAdjustment): RedirectResponse
    {
        try {
            $this->adjustmentService->post($stockAdjustment);
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return back()->with('success', "Penyesuaian {$stockAdjustment->reference} diposting — stok telah diperbarui.");
    }
}
