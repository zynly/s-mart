<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReceiveTransferRequest;
use App\Http\Requests\Admin\StoreTransferRequest;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\StockTransfer;
use App\Services\TransferService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TransferController extends Controller
{
    public function __construct(private readonly TransferService $transferService) {}

    public function index(Request $request): Response
    {
        $transfers = StockTransfer::query()
            ->with(['fromOutlet:id,name', 'toOutlet:id,name', 'creator:id,name', 'items.product:id,name'])
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Transfers/Index', [
            'tab' => 'transfers',
            'transfers' => $transfers,
            'products' => Product::where('is_active', true)->with('baseUnit:id,code')->orderBy('name')->get(['id', 'name', 'base_unit_id']),
            'outlets' => Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only('status'),
        ]);
    }

    public function store(StoreTransferRequest $request): RedirectResponse
    {
        try {
            $transfer = $this->transferService->create($request->validated(), $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['items' => $e->getMessage()]);
        }

        return back()->with('success', "Transfer {$transfer->reference} dibuat.");
    }

    public function approve(Request $request, StockTransfer $transfer): RedirectResponse
    {
        try {
            $this->transferService->approve($transfer, $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return back()->with('success', "Transfer {$transfer->reference} disetujui.");
    }

    public function send(Request $request, StockTransfer $transfer): RedirectResponse
    {
        try {
            $this->transferService->send($transfer, $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return back()->with('success', "Transfer {$transfer->reference} dikirim.");
    }

    public function receive(ReceiveTransferRequest $request, StockTransfer $transfer): RedirectResponse
    {
        try {
            $this->transferService->receive($transfer, $request->validated('items'), $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['items' => $e->getMessage()]);
        }

        return back()->with('success', "Transfer {$transfer->reference} diterima.");
    }

    public function cancel(Request $request, StockTransfer $transfer): RedirectResponse
    {
        try {
            $this->transferService->cancel($transfer, $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return back()->with('success', "Transfer {$transfer->reference} dibatalkan.");
    }
}
