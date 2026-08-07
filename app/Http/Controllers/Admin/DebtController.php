<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\DebtOverpaymentException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PayDebtRequest;
use App\Models\Debt;
use App\Models\PaymentMethod;
use App\Services\DebtService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DebtController extends Controller
{
    public function __construct(private readonly DebtService $debtService) {}

    public function index(Request $request): Response
    {
        $debts = Debt::query()
            ->with([
                'supplier:id,name',
                'purchase:id,reference',
                'payments' => fn ($q) => $q->with(['paymentMethod:id,name', 'creator:id,name'])->latest(),
            ])
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->when($request->integer('supplier_id'), fn ($q, $id) => $q->where('supplier_id', $id))
            ->orderBy('due_date')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Debts/Index', [
            'tab' => 'debts',
            'debts' => $debts,
            'aging' => $this->debtService->getAging()->map(fn ($row) => [
                'debt' => $row['debt'],
                'bucket' => $row['bucket'],
            ]),
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('sort_order')->get(['id', 'name']),
            'filters' => $request->only('status', 'supplier_id'),
        ]);
    }

    public function pay(PayDebtRequest $request, Debt $debt): RedirectResponse
    {
        try {
            $this->debtService->pay(
                $debt,
                (int) $request->validated('amount'),
                (int) $request->validated('payment_method_id'),
                $request->user(),
                $request->validated('ref_no'),
                $request->validated('note'),
            );
        } catch (DebtOverpaymentException $e) {
            throw ValidationException::withMessages(['amount' => $e->getMessage()]);
        }

        return back()->with('success', 'Pembayaran hutang berhasil dicatat.');
    }
}
