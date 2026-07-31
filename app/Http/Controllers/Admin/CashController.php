<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\InsufficientCashBalanceException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCashTransactionRequest;
use App\Http\Requests\Admin\TransferCashRequest;
use App\Models\CashAccount;
use App\Models\CashCategory;
use App\Models\CashTransaction;
use App\Services\CashierSessionService;
use App\Services\CashService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CashController extends Controller
{
    public function __construct(
        private readonly CashService $cashService,
        private readonly CashierSessionService $sessionService,
    ) {}

    public function index(Request $request): Response
    {
        $transactions = CashTransaction::query()
            ->with(['cashAccount:id,name', 'cashCategory:id,name', 'transferToAccount:id,name'])
            ->when($request->integer('cash_account_id'), fn ($q, $id) => $q->where('cash_account_id', $id))
            ->when($request->string('type')->toString(), fn ($q, $type) => $q->where('type', $type))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Cash/Index', [
            'transactions' => $transactions,
            'accounts' => CashAccount::where('is_active', true)->orderBy('name')->get(['id', 'name', 'type', 'current_balance', 'is_drawer']),
            'categories' => CashCategory::where('is_active', true)->orderBy('name')->get(['id', 'name', 'type']),
            'filters' => $request->only('cash_account_id', 'type'),
        ]);
    }

    public function storeIn(StoreCashTransactionRequest $request): RedirectResponse
    {
        $account = CashAccount::findOrFail($request->validated('cash_account_id'));
        $session = $this->sessionService->getActive($request->user());

        $this->cashService->recordIn(
            $account,
            (int) $request->validated('amount'),
            $request->validated('cash_category_id'),
            $request->validated('description'),
            $session,
        );

        return back()->with('success', 'Kas masuk berhasil dicatat.');
    }

    public function storeOut(StoreCashTransactionRequest $request): RedirectResponse
    {
        $account = CashAccount::findOrFail($request->validated('cash_account_id'));
        $session = $this->sessionService->getActive($request->user());

        try {
            $this->cashService->recordOut(
                $account,
                (int) $request->validated('amount'),
                $request->validated('cash_category_id'),
                $request->validated('description'),
                $session,
            );
        } catch (InsufficientCashBalanceException $e) {
            throw ValidationException::withMessages(['amount' => $e->getMessage()]);
        }

        return back()->with('success', 'Kas keluar berhasil dicatat.');
    }

    public function transfer(TransferCashRequest $request): RedirectResponse
    {
        $from = CashAccount::findOrFail($request->validated('from_account_id'));
        $to = CashAccount::findOrFail($request->validated('to_account_id'));
        $session = $this->sessionService->getActive($request->user());

        try {
            if ($from->is_drawer && $session !== null && $session->cash_account_id === $from->id) {
                $this->cashService->dropCash($session, $to, (int) $request->validated('amount'));
            } else {
                $this->cashService->transfer($from, $to, (int) $request->validated('amount'), 'Transfer antar akun kas');
            }
        } catch (InsufficientCashBalanceException $e) {
            throw ValidationException::withMessages(['amount' => $e->getMessage()]);
        }

        return back()->with('success', 'Transfer kas berhasil.');
    }
}
