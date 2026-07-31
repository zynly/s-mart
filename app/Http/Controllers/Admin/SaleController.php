<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\InsufficientBalanceException;
use App\Exceptions\InsufficientStockException;
use App\Exceptions\MaxHoldExceededException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CompleteSaleRequest;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleHold;
use App\Services\BarcodeResolverService;
use App\Services\CardService;
use App\Services\CashierSessionService;
use App\Services\PriceService;
use App\Services\SaleService;
use Barryvdh\DomPDF\Facade\Pdf;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class SaleController extends Controller
{
    public function __construct(
        private readonly SaleService $saleService,
        private readonly CashierSessionService $sessionService,
        private readonly BarcodeResolverService $barcodeResolver,
        private readonly CardService $cardService,
        private readonly PriceService $priceService,
    ) {}

    public function index(Request $request): Response
    {
        $session = $this->sessionService->getActive($request->user());
        $outlet = $session?->outlet ?? Outlet::where('is_main', true)->first();

        return Inertia::render('Admin/Pos/Index', [
            'session' => $session,
            'outlet' => $outlet,
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name', 'type', 'allows_change']),
            'favoriteProducts' => Product::where('is_active', true)->where('is_favorite', true)
                ->with(['baseUnit:id,code,name', 'barcodes'])
                ->orderBy('name')
                ->limit(12)
                ->get(['id', 'name', 'sku', 'base_unit_id']),
            'holds' => $session !== null
                ? SaleHold::where('cashier_session_id', $session->id)->orderByDesc('held_at')->get(['id', 'reference', 'item_count', 'total', 'held_at', 'member_id'])
                : [],
        ]);
    }

    public function scan(Request $request): JsonResponse
    {
        $data = $request->validate(['barcode' => ['required', 'string']]);
        $outlet = Outlet::findOrFail($request->integer('outlet_id') ?: Outlet::where('is_main', true)->value('id'));

        try {
            $resolved = $this->barcodeResolver->resolve($data['barcode']);
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        }

        try {
            $memberId = $request->integer('member_id') ?: null;
            $price = $this->priceService->getActivePrice($resolved['product'], $outlet, $resolved['unit'], $memberId);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'product' => $resolved['product']->only(['id', 'name', 'sku']),
            'unit' => $resolved['unit']->only(['id', 'code', 'name']),
            'qty_multiplier' => $resolved['qty_multiplier'],
            'price' => $price,
        ]);
    }

    public function searchMember(Request $request): JsonResponse
    {
        $query = (string) $request->string('q');

        if ($query === '') {
            return response()->json(['members' => []]);
        }

        $exact = $this->cardService->resolve($query);

        if ($exact !== null) {
            return response()->json(['members' => [$this->memberPayload($exact)]]);
        }

        $matches = Member::where('status', 'active')
            ->where('name', 'like', "%{$query}%")
            ->with('level:id,name,color')
            ->limit(10)
            ->get();

        return response()->json(['members' => $matches->map(fn (Member $m) => $this->memberPayload($m))]);
    }

    private function memberPayload(Member $member): array
    {
        $member->loadMissing('level:id,name,color');

        return [
            'id' => $member->id,
            'member_number' => $member->member_number,
            'name' => $member->name,
            'class_name' => $member->class_name,
            'major' => $member->major,
            'balance_cache' => $member->balance_cache,
            'receivable_limit' => $member->receivable_limit,
            'level' => $member->level ? ['name' => $member->level->name, 'color' => $member->level->color] : null,
            'status' => $member->status,
        ];
    }

    public function store(CompleteSaleRequest $request): RedirectResponse
    {
        $idempotencyKey = (string) $request->header('X-Idempotency-Key');

        try {
            $sale = $this->saleService->complete([
                ...$request->safe()->except('items'),
                'items' => $request->validated('items'),
                'idempotency_key' => $idempotencyKey,
            ]);
        } catch (InsufficientStockException|InsufficientBalanceException $e) {
            throw ValidationException::withMessages(['items' => $e->getMessage()]);
        } catch (DomainException|RuntimeException $e) {
            throw ValidationException::withMessages(['items' => $e->getMessage()]);
        }

        return redirect()->route('pos.sales.receipt', $sale)->with('success', "Transaksi {$sale->reference} selesai.");
    }

    public function hold(Request $request): RedirectResponse
    {
        try {
            $this->saleService->hold($request->all());
        } catch (MaxHoldExceededException $e) {
            throw ValidationException::withMessages(['items' => $e->getMessage()]);
        }

        return back()->with('success', 'Transaksi ditahan (hold).');
    }

    public function recall(SaleHold $saleHold): JsonResponse
    {
        return response()->json(['cart' => $this->saleService->recall($saleHold)]);
    }

    public function void(Request $request, Sale $sale): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        try {
            $this->saleService->void($sale, $data['reason'], $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['reason' => $e->getMessage()]);
        }

        return back()->with('success', "Nota {$sale->reference} dibatalkan.");
    }

    public function receipt(Sale $sale): Response
    {
        return Inertia::render('Admin/Pos/Receipt', [
            'sale' => $sale->load(['items.product:id,name', 'member', 'paymentMethod', 'user:id,name']),
        ]);
    }

    public function receiptPdf(Sale $sale): HttpResponse
    {
        $sale->load(['items.product:id,name', 'member', 'paymentMethod', 'user:id,name', 'outlet']);
        $width = (int) config('pos.receipt_width', 58);

        $pdf = Pdf::loadView('pdf.receipt', ['sale' => $sale, 'width' => $width])
            ->setPaper([0, 0, $width * 2.8346, 1500], 'portrait');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$sale->reference}.pdf\"",
        ]);
    }
}
