<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreConsignmentSettlementRequest;
use App\Models\ConsignmentSettlement;
use App\Models\Outlet;
use App\Models\Supplier;
use App\Services\ConsignmentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class ConsignmentController extends Controller
{
    public function __construct(private readonly ConsignmentService $consignmentService) {}

    public function index(Request $request): Response
    {
        $settlements = ConsignmentSettlement::query()
            ->with(['supplier:id,name', 'outlet:id,name'])
            ->orderByDesc('period_end')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Consignment/Index', [
            'tab' => 'consignment',
            'settlements' => $settlements,
            'suppliers' => Supplier::where('is_consignor', true)->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'outlets' => Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StoreConsignmentSettlementRequest $request): RedirectResponse
    {
        $supplier = Supplier::findOrFail($request->validated('supplier_id'));
        $outlet = Outlet::findOrFail($request->validated('outlet_id'));

        $settlement = $this->consignmentService->settle(
            $supplier,
            $outlet,
            Carbon::parse($request->validated('period_start')),
            Carbon::parse($request->validated('period_end')),
            (float) $request->validated('commission_percent'),
        );

        return back()->with('success', "Settlement {$settlement->reference} berhasil dibuat.");
    }

    public function approve(Request $request, ConsignmentSettlement $consignment): RedirectResponse
    {
        $this->consignmentService->approve($consignment, $request->user());

        return back()->with('success', 'Settlement disetujui.');
    }

    public function markPaid(ConsignmentSettlement $consignment): RedirectResponse
    {
        $this->consignmentService->markPaid($consignment);

        return back()->with('success', 'Settlement ditandai lunas.');
    }
}
