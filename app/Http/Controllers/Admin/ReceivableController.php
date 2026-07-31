<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ReceivableOverpaymentException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PayReceivableRequest;
use App\Models\CashAccount;
use App\Models\Receivable;
use App\Services\ReceivableService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ReceivableController extends Controller
{
    public function __construct(private readonly ReceivableService $receivableService) {}

    public function index(Request $request): Response
    {
        $receivables = Receivable::query()
            ->with(['member:id,name,member_number', 'sale:id,reference'])
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->when($request->integer('member_id'), fn ($q, $id) => $q->where('member_id', $id))
            ->orderBy('due_date')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Receivables/Index', [
            'receivables' => $receivables,
            'aging' => $this->receivableService->getAging()->map(fn ($row) => [
                'receivable' => $row['receivable'],
                'bucket' => $row['bucket'],
            ]),
            'cashAccounts' => CashAccount::where('is_active', true)->get(['id', 'name']),
            'filters' => $request->only('status', 'member_id'),
        ]);
    }

    public function pay(PayReceivableRequest $request, Receivable $receivable): RedirectResponse
    {
        try {
            $this->receivableService->pay(
                $receivable,
                (int) $request->validated('amount'),
                $request->validated('payment_method'),
                $request->validated('cash_account_id'),
                null,
                $request->user(),
                $request->validated('note'),
            );
        } catch (ReceivableOverpaymentException $e) {
            throw ValidationException::withMessages(['amount' => $e->getMessage()]);
        }

        return back()->with('success', 'Pembayaran piutang berhasil dicatat.');
    }

    public function writeOff(Request $request, Receivable $receivable): RedirectResponse
    {
        try {
            $this->receivableService->writeOff($receivable, $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['receivable' => $e->getMessage()]);
        }

        return back()->with('success', "Piutang {$receivable->reference} dihapus (write-off).");
    }
}
