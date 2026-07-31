<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RecordOpnameCountRequest;
use App\Http\Requests\Admin\StoreOpnameRequest;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\StockOpname;
use App\Services\BarcodeResolverService;
use App\Services\OpnameService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OpnameController extends Controller
{
    public function __construct(
        private readonly OpnameService $opnameService,
        private readonly BarcodeResolverService $barcodeResolver,
    ) {}

    public function index(Request $request): Response
    {
        $opnames = StockOpname::query()
            ->with(['outlet:id,name', 'starter:id,name'])
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Opnames/Index', [
            'opnames' => $opnames,
            'outlets' => Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'brands' => Brand::orderBy('name')->get(['id', 'name']),
            'products' => Product::where('is_active', true)->orderBy('name')->get(['id', 'name', 'sku']),
            'filters' => $request->only('status'),
        ]);
    }

    public function store(StoreOpnameRequest $request): RedirectResponse
    {
        try {
            $opname = $this->opnameService->start($request->validated(), $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['scope' => $e->getMessage()]);
        }

        return redirect()->route('admin.opnames.show', $opname)->with('success', "Opname {$opname->reference} dimulai.");
    }

    public function show(Request $request, StockOpname $opname): Response
    {
        return Inertia::render('Admin/Opnames/Show', [
            'opname' => $opname->load([
                'outlet:id,name', 'starter:id,name', 'reviewer:id,name', 'approver:id,name', 'poster:id,name',
                'items.product:id,name,sku',
            ]),
            'canApproveVariance' => $request->user()->can('opname.approve_variance'),
            'tolerancePercent' => (float) config('pos.opname_tolerance_percent', 0.5),
        ]);
    }

    public function scan(Request $request, StockOpname $opname): JsonResponse
    {
        $data = $request->validate(['barcode' => ['required', 'string']]);

        try {
            $resolved = $this->barcodeResolver->resolve($data['barcode']);
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        }

        $item = $opname->items()->where('product_id', $resolved['product']->id)->first();

        if ($item === null) {
            return response()->json(['message' => "\"{$resolved['product']->name}\" tidak termasuk dalam cakupan opname ini."], 422);
        }

        return response()->json([
            'product' => $resolved['product']->only(['id', 'name', 'sku']),
            'item' => $item->only(['id', 'product_id', 'physical_qty']),
        ]);
    }

    public function count(RecordOpnameCountRequest $request, StockOpname $opname): JsonResponse
    {
        try {
            $item = $this->opnameService->recordCount(
                $opname,
                Product::findOrFail($request->validated('product_id')),
                (float) $request->validated('physical_qty'),
                $request->user(),
            );
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'item' => $item,
            'counted_items' => $opname->fresh()->counted_items,
            'total_items' => $opname->total_items,
        ]);
    }

    public function finishCounting(Request $request, StockOpname $opname): RedirectResponse
    {
        try {
            $this->opnameService->finishCounting($opname, $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return back()->with('success', "Penghitungan opname {$opname->reference} selesai — silakan tinjau selisih.");
    }

    public function approve(Request $request, StockOpname $opname): RedirectResponse
    {
        try {
            $this->opnameService->approve($opname, $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return back()->with('success', "Opname {$opname->reference} disetujui.");
    }

    public function post(Request $request, StockOpname $opname): RedirectResponse
    {
        try {
            $this->opnameService->post($opname, $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return back()->with('success', "Opname {$opname->reference} diposting — stok telah disesuaikan.");
    }

    public function cancel(Request $request, StockOpname $opname): RedirectResponse
    {
        try {
            $this->opnameService->cancel($opname, $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return redirect()->route('admin.opnames.index')->with('success', "Opname {$opname->reference} dibatalkan.");
    }

    public function updateReason(Request $request, StockOpname $opname): RedirectResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'variance_reason' => ['required', 'string', 'max:255'],
        ]);

        $item = $opname->items()->where('product_id', $data['product_id'])->firstOrFail();
        $item->update(['variance_reason' => $data['variance_reason']]);

        return back();
    }
}
