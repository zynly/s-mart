<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreConsignmentSettlementRequest;
use App\Models\CashAccount;
use App\Models\ConsignmentSettlement;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\StockLayer;
use App\Models\Supplier;
use App\Services\ConsignmentService;
use App\Services\PriceService;
use App\Services\PurchaseService;
use App\Services\StockService;
use Barryvdh\DomPDF\Facade\Pdf;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class ConsignmentController extends Controller
{
    public function __construct(
        private readonly ConsignmentService $consignmentService,
        private readonly PurchaseService $purchaseService,
        private readonly PriceService $priceService,
        private readonly StockService $stockService,
    ) {}

    public function index(Request $request): Response
    {
        $settlements = ConsignmentSettlement::query()
            ->with(['supplier:id,name', 'outlet:id,name', 'cashAccount:id,name'])
            ->orderByDesc('period_end')
            ->paginate(15, ['*'], 'settlement_page')
            ->withQueryString();

        $consignmentStocks = StockLayer::query()
            ->where('is_consignment', true)
            ->where('qty_remaining', '>', 0)
            ->with(['product:id,name,sku,base_unit_id', 'product.baseUnit:id,name,symbol', 'supplier:id,name', 'outlet:id,name'])
            ->orderBy('expired_at')
            ->paginate(15, ['*'], 'stock_page')
            ->withQueryString();

        $summary = [
            'unpaid_payable' => (int) ConsignmentSettlement::whereIn('status', ['draft', 'approved'])->sum('payable_amount'),
            'month_commission' => (int) ConsignmentSettlement::whereIn('status', ['approved', 'paid'])
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->sum('commission_amount'),
            'pending_count' => ConsignmentSettlement::whereIn('status', ['draft', 'approved'])->count(),
            'active_consignors_count' => Supplier::where('is_consignor', true)->where('is_active', true)->count(),
            'active_stock_qty' => (float) StockLayer::where('is_consignment', true)->where('qty_remaining', '>', 0)->sum('qty_remaining'),
        ];

        $defaultOutlet = Outlet::where('is_active', true)->first();
        $consignmentProducts = Product::query()
            ->where('is_consignment', true)
            ->where('is_active', true)
            ->with([
                'baseUnit:id,name,symbol',
                'prices' => function ($q) use ($defaultOutlet) {
                    if ($defaultOutlet) {
                        $q->where('outlet_id', $defaultOutlet->id);
                    }
                    $q->where('effective_from', '<=', now()->toDateString())
                        ->where(fn ($sq) => $sq->whereNull('effective_to')->orWhere('effective_to', '>=', now()->toDateString()))
                        ->orderByDesc('effective_from');
                },
            ])
            ->orderBy('name')
            ->get()
            ->map(function ($p) {
                $sellingPrice = (int) ($p->prices->first()?->price ?? 0);
                $percent = (float) ($p->consignment_percent ?? 20);
                $consignmentPrice = (int) round($sellingPrice * (1 - ($percent / 100)));

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'sku' => $p->sku,
                    'unit_id' => $p->base_unit_id,
                    'unit_symbol' => $p->baseUnit?->symbol ?? 'pcs',
                    'is_expirable' => (bool) $p->is_expirable,
                    'consignment_percent' => $percent,
                    'selling_price' => $sellingPrice,
                    'consignment_price' => $consignmentPrice,
                ];
            });

        return Inertia::render('Admin/Consignment/Index', [
            'tab' => 'consignment',
            'settlements' => $settlements,
            'consignmentStocks' => $consignmentStocks,
            'consignmentProducts' => $consignmentProducts,
            'summary' => $summary,
            'suppliers' => Supplier::where('is_consignor', true)->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'phone']),
            'outlets' => Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'cashAccounts' => CashAccount::where('is_active', true)->orderBy('name')->get(['id', 'name', 'type', 'current_balance', 'outlet_id']),
        ]);
    }

    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'outlet_id' => ['required', 'exists:outlets,id'],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
            'commission_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'product_id' => ['nullable', 'exists:products,id'],
        ]);

        $supplier = Supplier::findOrFail($validated['supplier_id']);
        $outlet = Outlet::findOrFail($validated['outlet_id']);
        $periodStart = Carbon::parse($validated['period_start']);
        $periodEnd = Carbon::parse($validated['period_end']);
        $commissionPercent = (float) $validated['commission_percent'];
        $productId = $request->filled('product_id') ? (int) $request->input('product_id') : null;

        $overlapping = ConsignmentSettlement::where('supplier_id', $supplier->id)
            ->where('outlet_id', $outlet->id)
            ->whereIn('status', ['draft', 'approved', 'paid'])
            ->where('period_start', '<=', $periodEnd)
            ->where('period_end', '>=', $periodStart)
            ->exists();

        $calc = $this->consignmentService->calculateSettlement($supplier, $outlet, $periodStart, $periodEnd, $commissionPercent, $productId);

        $enrichedItems = [];
        foreach ($calc['items'] as $item) {
            $product = Product::with('baseUnit:id,name,symbol')->find($item['product_id']);
            $remainingConsignmentStock = (float) StockLayer::where('product_id', $item['product_id'])
                ->where('outlet_id', $outlet->id)
                ->where('is_consignment', true)
                ->sum('qty_remaining');

            $sellingPrice = (int) $item['unit_price'];
            $consignmentPrice = (int) ($item['consignment_price'] ?? ($item['qty_sold'] > 0 ? round($item['payable'] / $item['qty_sold']) : 0));

            $enrichedItems[] = array_merge($item, [
                'product_name' => $product?->name ?? 'Produk #'.$item['product_id'],
                'sku' => $product?->sku ?? '-',
                'unit' => $product?->baseUnit?->symbol ?? $product?->baseUnit?->name ?? 'pcs',
                'selling_price' => $sellingPrice,
                'consignment_price' => $consignmentPrice,
                'commission_per_unit' => $sellingPrice - $consignmentPrice,
                'remaining_stock' => $remainingConsignmentStock,
            ]);
        }

        return response()->json([
            'overlapping' => $overlapping,
            'total_sold' => $calc['total_sold'],
            'commission_amount' => $calc['commission_amount'],
            'payable_amount' => $calc['payable_amount'],
            'items' => $enrichedItems,
        ]);
    }

    public function show(ConsignmentSettlement $consignment): Response
    {
        $consignment->load([
            'supplier:id,name,code,phone,address',
            'outlet:id,name',
            'cashAccount:id,name,type',
            'creator:id,name',
            'approver:id,name',
            'items.product:id,name,sku,base_unit_id',
            'items.product.baseUnit:id,name,symbol',
        ]);

        return Inertia::render('Admin/Consignment/Show', [
            'settlement' => $consignment,
            'cashAccounts' => CashAccount::where('is_active', true)
                ->where('outlet_id', $consignment->outlet_id)
                ->orderBy('name')
                ->get(['id', 'name', 'type', 'current_balance']),
        ]);
    }

    public function store(StoreConsignmentSettlementRequest $request): RedirectResponse
    {
        $supplier = Supplier::findOrFail($request->validated('supplier_id'));
        $outlet = Outlet::findOrFail($request->validated('outlet_id'));
        $productId = $request->filled('product_id') ? (int) $request->validated('product_id') : null;

        $settlement = $this->consignmentService->settle(
            $supplier,
            $outlet,
            Carbon::parse($request->validated('period_start')),
            Carbon::parse($request->validated('period_end')),
            (float) $request->validated('commission_percent'),
            $productId,
        );

        return redirect()->route('admin.consignment.show', $settlement->id)
            ->with('success', "Settlement {$settlement->reference} berhasil dibuat.");
    }

    public function approve(Request $request, ConsignmentSettlement $consignment): RedirectResponse
    {
        $this->consignmentService->approve($consignment, $request->user());

        return back()->with('success', 'Settlement disetujui.');
    }

    public function markPaid(Request $request, ConsignmentSettlement $consignment): RedirectResponse
    {
        $cashAccount = $request->filled('cash_account_id')
            ? CashAccount::findOrFail($request->input('cash_account_id'))
            : null;

        $this->consignmentService->markPaid($consignment, $cashAccount);

        return back()->with('success', 'Settlement ditandai lunas.');
    }

    public function exportPdf(ConsignmentSettlement $consignment)
    {
        $settlement = $consignment->loadMissing([
            'supplier',
            'outlet',
            'cashAccount',
            'creator',
            'approver',
            'items.product.baseUnit',
        ]);

        $pdf = Pdf::loadView('pdf.consignment-settlement', [
            'settlement' => $settlement,
        ])->setPaper('a4', 'portrait');

        return $pdf->stream("settlement-{$settlement->reference}.pdf");
    }

    public function returnGoods(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'stock_layer_id' => ['required', 'exists:stock_layers,id'],
            'qty' => ['required', 'numeric', 'min:0.001'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $layer = StockLayer::with(['product', 'outlet'])->findOrFail($validated['stock_layer_id']);

        if (! $layer->is_consignment) {
            throw new DomainException('Hanya barang konsinyasi yang dapat diretur melalui alur ini.');
        }

        if ($validated['qty'] > (float) $layer->qty_remaining) {
            throw new DomainException("Qty retur ({$validated['qty']}) melebihi sisa stok pada batch layer ini ({$layer->qty_remaining}).");
        }

        $this->consignmentService->returnGoods($layer, (float) $validated['qty']);

        return back()->with('success', "Berhasil meretur {$validated['qty']} {$layer->product->name} ke pemasok.");
    }

    public function receiveGoods(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'outlet_id' => ['required', 'exists:outlets,id'],
            'product_id' => ['required', 'exists:products,id'],
            'qty' => ['required', 'numeric', 'min:0.001'],
            'consignment_price' => ['required', 'integer', 'min:0'],
            'selling_price' => ['nullable', 'integer', 'min:0'],
            'batch_no' => ['nullable', 'string', 'max:50'],
            'expired_at' => ['nullable', 'date'],
        ]);

        $supplier = Supplier::findOrFail($validated['supplier_id']);
        $outlet = Outlet::findOrFail($validated['outlet_id']);
        $product = Product::with('baseUnit')->findOrFail($validated['product_id']);

        if (! $product->is_consignment) {
            throw new DomainException("Produk {$product->name} bukan produk konsinyasi.");
        }

        if ($product->is_expirable && empty($validated['expired_at'])) {
            throw new DomainException("Produk {$product->name} wajib memiliki tanggal kedaluwarsa.");
        }

        $expiredAt = ! empty($validated['expired_at']) ? Carbon::parse($validated['expired_at']) : null;

        $this->stockService->addLayer(
            product: $product,
            outlet: $outlet,
            qty: (float) $validated['qty'],
            unitCost: (int) $validated['consignment_price'],
            batchNo: $validated['batch_no'] ?? null,
            expiredAt: $expiredAt,
            source: null,
            isConsignment: true,
            supplierId: $supplier->id,
        );

        // Jika harga jual kasir diisi dan berbeda, perbarui harga aktif di outlet
        if (! empty($validated['selling_price']) && $validated['selling_price'] > 0 && $product->baseUnit) {
            $this->priceService->changePrice(
                product: $product,
                outlet: $outlet,
                unit: $product->baseUnit,
                newPrice: (int) $validated['selling_price'],
                from: now()->toDateString(),
            );
        }

        $unitSymbol = $product->baseUnit?->symbol ?? 'pcs';

        return back()->with('success', "Barang titipan {$product->name} ({$validated['qty']} {$unitSymbol}) berhasil diterima ke rak toko.");
    }
}
