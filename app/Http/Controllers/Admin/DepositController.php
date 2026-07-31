<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\InsufficientBalanceException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAdjustmentRequest;
use App\Http\Requests\Admin\StoreTopupRequest;
use App\Http\Requests\Admin\StoreWithdrawalRequest;
use App\Models\DepositTransaction;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Services\DepositService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DepositController extends Controller
{
    public function __construct(private readonly DepositService $depositService) {}

    public function index(Request $request): Response
    {
        $transactions = DepositTransaction::query()
            ->with(['member:id,name,member_number', 'paymentMethod:id,name'])
            ->when($request->integer('member_id'), fn ($q, $memberId) => $q->where('member_id', $memberId))
            ->when($request->string('type')->toString(), fn ($q, $type) => $q->where('type', $type))
            ->when($request->date('from'), fn ($q, $from) => $q->whereDate('created_at', '>=', $from))
            ->when($request->date('to'), fn ($q, $to) => $q->whereDate('created_at', '<=', $to))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Deposit/Index', [
            'transactions' => $transactions,
            'members' => Member::where('status', 'active')->orderBy('name')->get(['id', 'name', 'member_number', 'nis', 'balance_cache']),
            'paymentMethods' => PaymentMethod::whereIn('type', ['cash', 'transfer'])->where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'type']),
            'outlets' => Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only('member_id', 'type', 'from', 'to'),
            'canWithdraw' => $request->user()->can('withdrawal.create'),
            'canAdjust' => $request->user()->can('deposit.adjust'),
        ]);
    }

    public function storeTopup(StoreTopupRequest $request): RedirectResponse
    {
        $member = Member::findOrFail($request->validated('member_id'));

        $this->depositService->topup(
            $member,
            (int) $request->validated('amount'),
            (int) $request->validated('payment_method_id'),
            (string) $request->header('X-Idempotency-Key'),
            (int) $request->validated('outlet_id'),
        );

        return back()->with('success', "Top-up Rp {$request->validated('amount')} berhasil untuk {$member->name}.");
    }

    public function storeWithdrawal(StoreWithdrawalRequest $request): RedirectResponse
    {
        $member = Member::findOrFail($request->validated('member_id'));

        try {
            $this->depositService->withdraw(
                $member,
                (int) $request->validated('amount'),
                $request->user(),
                (string) $request->header('X-Idempotency-Key'),
                $request->validated('note'),
            );
        } catch (InsufficientBalanceException $e) {
            throw ValidationException::withMessages(['amount' => $e->getMessage()]);
        }

        return back()->with('success', 'Penarikan saldo berhasil.');
    }

    public function storeAdjustment(StoreAdjustmentRequest $request): RedirectResponse
    {
        $member = Member::findOrFail($request->validated('member_id'));

        try {
            $this->depositService->adjust(
                $member,
                (int) $request->validated('amount'),
                $request->validated('reason'),
                $request->user(),
                (string) $request->header('X-Idempotency-Key'),
            );
        } catch (InsufficientBalanceException $e) {
            throw ValidationException::withMessages(['amount' => $e->getMessage()]);
        }

        return back()->with('success', 'Penyesuaian saldo berhasil.');
    }
}
