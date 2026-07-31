<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSaleReturnRequest;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\User;
use App\Services\CashierSessionService;
use App\Services\SaleReturnService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SaleReturnController extends Controller
{
    public function __construct(
        private readonly SaleReturnService $saleReturnService,
        private readonly CashierSessionService $sessionService,
    ) {}

    public function index(Request $request): Response
    {
        $returns = SaleReturn::query()
            ->with(['sale:id,reference', 'member:id,name,member_number', 'creator:id,name'])
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/SaleReturns/Index', [
            'returns' => $returns,
            'filters' => $request->only('status'),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Admin/SaleReturns/Create', [
            'session' => $this->sessionService->getActive($request->user()),
        ]);
    }

    public function lookup(Request $request): JsonResponse
    {
        $data = $request->validate(['reference' => ['required', 'string']]);

        $sale = Sale::where('reference', $data['reference'])
            ->with(['items.product:id,name', 'items.unit:id,code', 'member:id,name,member_number'])
            ->first();

        if ($sale === null) {
            return response()->json(['message' => 'Nota tidak ditemukan.'], 404);
        }

        try {
            $this->saleReturnService->assertReturnable($sale);
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'sale' => $sale->only(['id', 'reference', 'sale_date', 'grand_total']),
            'member' => $sale->member,
            'items' => $this->saleReturnService->getReturnableItems($sale),
        ]);
    }

    public function refundPreview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sale_id' => ['required', 'exists:sales,id'],
            'refund_total' => ['required', 'integer', 'min:1'],
        ]);

        $sale = Sale::findOrFail($data['sale_id']);

        try {
            return response()->json($this->saleReturnService->calculateRefundOptions($sale, $data['refund_total']));
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function store(StoreSaleReturnRequest $request): RedirectResponse
    {
        $idempotencyKey = (string) $request->header('X-Idempotency-Key');
        $approver = $request->validated('approver_id') !== null
            ? User::find($request->validated('approver_id'))
            : null;

        try {
            $saleReturn = $this->saleReturnService->createAndProcess([
                ...$request->safe()->except('approver_id'),
                'idempotency_key' => $idempotencyKey,
            ], $approver);
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['items' => $e->getMessage()]);
        }

        return redirect()->route('admin.sale-returns.index')->with('success', "Retur {$saleReturn->reference} berhasil diproses.");
    }
}
