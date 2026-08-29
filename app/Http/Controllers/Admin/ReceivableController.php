<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\ReceivableOverpaymentException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PayReceivableRequest;
use App\Models\CashAccount;
use App\Models\Member;
use App\Models\Receivable;
use App\Models\ReceivablePayment;
use App\Services\Midtrans\MidtransGatewayInterface;
use App\Services\ReceivableService;
use Barryvdh\DomPDF\Facade\Pdf;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ReceivableController extends Controller
{
    public function __construct(
        private readonly ReceivableService $receivableService,
        private readonly MidtransGatewayInterface $midtransGateway,
    ) {}

    public function index(Request $request): Response
    {
        $statusFilter = $request->string('status')->toString();
        $typeFilter   = $request->string('type')->toString();
        $search       = $request->string('search')->toString();

        $members = Member::query()
            ->select(['id', 'name', 'member_number', 'nis', 'type', 'receivable_limit'])
            ->whereHas('receivables')
            ->with([
                'receivables' => fn ($q) => $q->select(['id', 'member_id', 'sale_id', 'reference', 'total_amount', 'paid_amount', 'remaining_amount', 'due_date', 'status', 'created_at'])
                    ->with('sale:id,reference')
                    ->orderBy('due_date', 'asc')
                    ->orderBy('id', 'asc'),
                'receivables.payments' => fn ($q) => $q->select(['id', 'receivable_id', 'reference', 'payment_date', 'amount', 'payment_method', 'note', 'cash_account_id', 'created_by', 'created_at'])
                    ->with(['cashAccount:id,name', 'creator:id,name', 'receivable:id,reference,sale_id', 'receivable.sale:id,reference'])
                    ->orderByDesc('created_at'),
            ])
            ->when($search, fn ($q) => $q->where(
                fn ($sub) => $sub->where('name', 'ilike', "%{$search}%")
                    ->orWhere('member_number', 'ilike', "%{$search}%")
                    ->orWhere('nis', 'ilike', "%{$search}%")
            ))
            ->when($typeFilter, fn ($q) => $q->where('type', $typeFilter))
            ->orderBy('name')
            ->get()
            ->map(function (Member $member) {
                $receivables = $member->receivables;
                $activeReceivables = $receivables->filter(fn ($r) => in_array($r->status, ['unpaid', 'partial', 'overdue'], true));

                $totalAmount = (int) $receivables->sum('total_amount');
                $paidAmount = (int) $receivables->sum('paid_amount');
                $remainingAmount = (int) $receivables->sum('remaining_amount');

                // Determine member status
                $hasOverdue = $activeReceivables->contains(fn ($r) => $r->status === 'overdue' || (now()->toDateString() > $r->due_date->format('Y-m-d') && $r->remaining_amount > 0));
                if ($hasOverdue) {
                    $status = 'overdue';
                } elseif ($remainingAmount <= 0) {
                    $status = 'paid';
                } elseif ($paidAmount > 0) {
                    $status = 'partial';
                } else {
                    $status = 'unpaid';
                }

                $nearestDue = $activeReceivables->min('due_date');

                // Collect all payments
                $payments = $receivables->flatMap->payments->sortByDesc('created_at')->values()->map(fn ($p) => [
                    'id' => $p->id,
                    'reference' => $p->reference,
                    'payment_date' => $p->payment_date ? $p->payment_date->format('Y-m-d') : $p->created_at->format('Y-m-d'),
                    'amount' => $p->amount,
                    'payment_method' => $p->payment_method,
                    'note' => $p->note,
                    'receivable_reference' => $p->receivable?->reference,
                    'sale_reference' => $p->receivable?->sale?->reference,
                    'cash_account_name' => $p->cashAccount?->name,
                    'creator_name' => $p->creator?->name ?? 'Kasir',
                    'created_at' => $p->created_at->toISOString(),
                ]);

                return [
                    'id' => $member->id,
                    'name' => $member->name,
                    'member_number' => $member->member_number,
                    'nis' => $member->nis,
                    'type' => $member->type,
                    'receivable_limit' => (int) $member->receivable_limit,
                    'total_amount' => $totalAmount,
                    'paid_amount' => $paidAmount,
                    'remaining_amount' => $remainingAmount,
                    'active_count' => $activeReceivables->count(),
                    'nearest_due_date' => $nearestDue ? $nearestDue->format('Y-m-d') : null,
                    'status' => $status,
                    'receivables' => $receivables->map(fn ($r) => [
                        'id' => $r->id,
                        'reference' => $r->reference,
                        'sale_id' => $r->sale_id,
                        'sale_reference' => $r->sale?->reference,
                        'total_amount' => $r->total_amount,
                        'paid_amount' => $r->paid_amount,
                        'remaining_amount' => $r->remaining_amount,
                        'due_date' => $r->due_date ? $r->due_date->format('Y-m-d') : null,
                        'status' => $r->status,
                        'created_at' => $r->created_at->toISOString(),
                    ]),
                    'payments' => $payments,
                ];
            })
            ->when($statusFilter, fn ($collection) => $collection->where('status', $statusFilter)->values());

        // Simple manual pagination for the aggregated collection
        $page = (int) $request->input('page', 1);
        $perPage = 15;
        $total = $members->count();
        $paginatedItems = $members->slice(($page - 1) * $perPage, $perPage)->values();

        return Inertia::render('Admin/Receivables/Index', [
            'tab' => 'receivables',
            'memberReceivables' => [
                'data' => $paginatedItems,
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => (int) ceil($total / $perPage),
            ],
            'aging' => $this->receivableService->getAging()->map(fn ($row) => [
                'receivable' => $row['receivable'],
                'bucket' => $row['bucket'],
            ]),
            'cashAccounts' => CashAccount::where('is_active', true)->get(['id', 'name']),
            'filters' => $request->only('status', 'type', 'search'),
            'midtransClientKey' => config('services.midtrans.client_key'),
            'midtransIsProduction' => (bool) config('services.midtrans.is_production'),
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

    public function payInstallment(Request $request, Member $member): RedirectResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'integer', 'min:1'],
            'payment_method' => ['required', 'string', 'in:cash,qris,transfer'],
            'receivable_id' => ['nullable', 'integer', 'exists:receivables,id'],
            'cash_account_id' => ['nullable', 'integer', 'exists:cash_accounts,id'],
            'cashier_pin' => ['nullable', 'string', 'max:10'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $payments = $this->receivableService->payInstallment(
                $member,
                (int) $validated['amount'],
                $validated['payment_method'],
                $validated['receivable_id'] ? (int) $validated['receivable_id'] : null,
                $validated['cash_account_id'] ? (int) $validated['cash_account_id'] : null,
                $validated['cashier_pin'] ?? null,
                $request->user(),
                $validated['note'] ?? null,
            );
        } catch (ReceivableOverpaymentException $e) {
            throw ValidationException::withMessages(['amount' => $e->getMessage()]);
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['amount' => $e->getMessage()]);
        }

        $lastPaymentId = $payments->last()?->id;

        return back()
            ->with('last_payment_id', $lastPaymentId)
            ->with('success', "Pembayaran cicilan piutang Rp ".number_format($validated['amount'], 0, ',', '.')." berhasil dicatat.");
    }

    public function receiptPdf(ReceivablePayment $payment): HttpResponse
    {
        $payment->load(['receivable.member', 'receivable.sale', 'receivable.outlet', 'cashAccount', 'creator']);
        $width = (int) config('pos.receipt_width', 58);

        $pdf = Pdf::loadView('pdf.receivable_payment', ['payment' => $payment, 'width' => $width])
            ->setPaper([0, 0, $width * 2.8346, 280], 'portrait');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$payment->reference}.pdf\"",
        ]);
    }

    public function createSnap(Request $request, Member $member): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'integer', 'min:1'],
            'receivable_id' => ['nullable', 'integer'],
        ]);

        $orderId = 'PTG-SNAP-'.$member->id.'-'.Str::random(8);

        try {
            $result = $this->midtransGateway->createTransaction(
                $orderId,
                (int) $validated['amount'],
                [
                    'first_name' => $member->name,
                    'phone' => $member->phone ?? '',
                ],
                [
                    [
                        'id' => 'CICILAN-PIUTANG',
                        'price' => (int) $validated['amount'],
                        'quantity' => 1,
                        'name' => 'Cicilan Piutang - '.$member->name,
                    ],
                ],
            );

            return response()->json([
                'snap_token' => $result['token'],
                'order_id' => $orderId,
                'redirect_url' => $result['redirect_url'] ?? null,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal membuat sesi gateway: '.$e->getMessage()], 422);
        }
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
