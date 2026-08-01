<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreWriteOffRequest;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\StockWriteOff;
use App\Services\WriteOffService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class WriteOffController extends Controller
{
    public function __construct(private readonly WriteOffService $writeOffService) {}

    public function index(Request $request): Response
    {
        $writeOffs = StockWriteOff::query()
            ->with(['product:id,name', 'outlet:id,name', 'requester:id,name', 'approver:id,name'])
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/WriteOffs/Index', [
            'tab' => 'write-offs',
            'writeOffs' => $writeOffs,
            'products' => Product::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'outlets' => Outlet::where('is_active', true)->get(['id', 'name']),
            'filters' => $request->only('status'),
        ]);
    }

    public function store(StoreWriteOffRequest $request): RedirectResponse
    {
        $writeOff = $this->writeOffService->request($request->validated(), $request->user());

        return back()->with('success', "Pengajuan write-off {$writeOff->reference} dibuat.");
    }

    public function approve(Request $request, StockWriteOff $writeOff): RedirectResponse
    {
        try {
            $this->writeOffService->approve($writeOff, $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return back()->with('success', "Write-off {$writeOff->reference} disetujui.");
    }

    public function process(StockWriteOff $writeOff): RedirectResponse
    {
        try {
            $this->writeOffService->process($writeOff);
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return back()->with('success', "Write-off {$writeOff->reference} diproses — stok telah dikurangi.");
    }

    public function reject(Request $request, StockWriteOff $writeOff): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        try {
            $this->writeOffService->reject($writeOff, $request->user(), $data['reason']);
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return back()->with('success', "Write-off {$writeOff->reference} ditolak.");
    }
}
