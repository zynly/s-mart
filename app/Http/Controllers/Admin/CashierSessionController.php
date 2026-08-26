<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\CashDifferenceRequiresApprovalException;
use App\Exceptions\SessionAlreadyOpenException;
use App\Exceptions\SessionCannotCloseWithHoldsException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CloseCashierSessionRequest;
use App\Http\Requests\Admin\OpenCashierSessionRequest;
use App\Models\CashAccount;
use App\Models\CashierSession;
use App\Models\Outlet;
use App\Models\Sale;
use App\Services\AuthorizationService;
use App\Services\CashierSessionService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CashierSessionController extends Controller
{
    public function __construct(
        private readonly CashierSessionService $sessionService,
        private readonly AuthorizationService $authorizationService,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        // 1. Dapatkan semua sesi kasir yang berstatus 'open' (aktif)
        $openSessionsQuery = CashierSession::with([
            'user:id,name,username',
            'cashAccount:id,name,code,outlet_id',
            'outlet:id,name',
        ])
        ->where('status', 'open');

        // Jika bukan Owner global, filter berdasarkan outlet aktif / primary outlet user
        if (! $user->hasRole('owner')) {
            $outletId = session('active_outlet_id') ?? $user->primaryOutletId();
            if ($outletId) {
                $openSessionsQuery->where('outlet_id', $outletId);
            }
        }

        $openSessions = $openSessionsQuery->orderByDesc('opened_at')->get();

        // 2. Dapatkan sesi kasir milik user yang sedang login saat ini (jika ada)
        $ownActive = $openSessions->firstWhere('user_id', $user->id);

        // 3. Tentukan sesi aktif yang dipilih untuk ditampilkan (query param selected_session_id, atau default milik sendiri / sesi open pertama)
        $selectedId = $request->integer('selected_session_id');
        $active = null;

        if ($selectedId > 0) {
            $active = $openSessions->firstWhere('id', $selectedId)
                ?? CashierSession::with(['user:id,name,username', 'cashAccount:id,name,code', 'outlet:id,name'])->find($selectedId);
        }

        if ($active === null) {
            $active = $ownActive;
        }

        return Inertia::render('Admin/CashierSession/Index', [
            'tab' => 'cashier-session',
            'active' => $active?->load(['cashAccount:id,name,code', 'user:id,name,username', 'outlet:id,name']),
            'expected' => $active !== null ? $this->sessionService->calculateExpected($active) : null,
            'openSessions' => $openSessions->map(fn ($s) => [
                'id' => $s->id,
                'reference' => $s->reference,
                'user_id' => $s->user_id,
                'user_name' => $s->user->name ?? 'Kasir',
                'drawer_name' => $s->cashAccount->name ?? 'Laci Kasir',
                'outlet_name' => $s->outlet->name ?? '',
                'opened_at' => $s->opened_at?->toIso8601String(),
                'opening_cash' => $s->opening_cash,
                'is_own' => $s->user_id === $user->id,
            ])->values()->all(),
            'ownActiveSessionId' => $ownActive?->id,
            'cashAccounts' => CashAccount::where('is_drawer', true)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'current_balance', 'is_default', 'outlet_id'])
                ->map(function ($acc) use ($user) {
                    $openSession = CashierSession::with('user:id,name')->where('cash_account_id', $acc->id)->where('status', 'open')->first();
                    return [
                        'id' => $acc->id,
                        'name' => $acc->name,
                        'code' => $acc->code,
                        'current_balance' => $acc->current_balance,
                        'is_default' => $acc->is_default,
                        'outlet_id' => $acc->outlet_id,
                        'is_open' => $openSession !== null,
                        'open_user_name' => $openSession?->user?->name,
                        'is_own_open' => $openSession?->user_id === $user->id,
                    ];
                })->values()->all(),
            'outlets' => Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'activeSales' => $active !== null
                ? Sale::with([
                    'user:id,name',
                    'member:id,name,member_number',
                    'payments.paymentMethod:id,name,type',
                ])
                ->where('cashier_session_id', $active->id)
                ->orderByDesc('id')
                ->get()
                ->map(fn ($sale) => [
                    'id' => $sale->id,
                    'reference' => $sale->reference,
                    'kasir_name' => $sale->user?->name ?? 'Kasir',
                    'customer_name' => $sale->member?->name ? ($sale->member->name . ' (' . $sale->member->member_number . ')') : 'Pelanggan Umum',
                    'sale_date' => $sale->sale_date?->toIso8601String(),
                    'payment_methods' => $sale->payments->map(fn ($p) => $p->paymentMethod?->name ?? 'Tunai')->values()->all(),
                    'subtotal' => $sale->subtotal ?? $sale->grand_total,
                    'discount_amount' => $sale->discount_amount ?? 0,
                    'tax_amount' => $sale->tax_amount ?? 0,
                    'grand_total' => $sale->grand_total,
                    'status' => $sale->status,
                    'voided_at' => $sale->voided_at?->toIso8601String(),
                    'notes' => $sale->notes,
                ])
                : [],
            'recentSessions' => CashierSession::with(['user:id,name', 'cashAccount:id,name'])
                ->where('status', '!=', 'open')
                ->when(! $user->hasRole('owner'), function ($q) use ($user) {
                    $outletId = session('active_outlet_id') ?? $user->primaryOutletId();
                    if ($outletId) {
                        $q->where('outlet_id', $outletId);
                    }
                })
                ->orderByDesc('closed_at')
                ->limit(50)
                ->get()
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'reference' => $s->reference,
                    'user_name' => $s->user?->name ?? 'Kasir',
                    'drawer_name' => $s->cashAccount?->name ?? 'Laci Kasir',
                    'opened_at' => $s->opened_at?->toIso8601String(),
                    'closed_at' => $s->closed_at?->toIso8601String(),
                    'opening_cash' => $s->opening_cash,
                    'total_sales_cash' => $s->total_sales_cash ?? 0,
                    'total_sales_deposit' => $s->total_sales_deposit ?? 0,
                    'total_sales_noncash' => $s->total_sales_noncash ?? 0,
                    'total_sales_credit' => $s->total_sales_credit ?? 0,
                    'total_topup_cash' => $s->total_topup_cash ?? 0,
                    'total_receivable_cash' => $s->total_receivable_cash ?? 0,
                    'total_cash_in' => $s->total_cash_in ?? 0,
                    'total_cash_out' => $s->total_cash_out ?? 0,
                    'expected_cash' => $s->expected_cash,
                    'actual_cash' => $s->actual_cash,
                    'difference' => $s->difference,
                    'status' => $s->status,
                ]),
        ]);
    }

    public function open(OpenCashierSessionRequest $request): RedirectResponse
    {
        try {
            $this->sessionService->open(
                $request->user(),
                CashAccount::findOrFail($request->validated('cash_account_id')),
                (int) $request->validated('opening_cash'),
            );
        } catch (SessionAlreadyOpenException $e) {
            throw ValidationException::withMessages(['cash_account_id' => $e->getMessage()]);
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['cash_account_id' => $e->getMessage()]);
        }

        return to_route('pos.index')->with('success', 'Sesi kasir berhasil dibuka. Selamat bertugas!');
    }

    public function close(CloseCashierSessionRequest $request, CashierSession $cashierSession): RedirectResponse
    {
        // Audit Fase 1 (Temuan Tinggi #3, IDOR): sebelumnya endpoint ini
        // cuma digerbang `can:pos.update` (permission generik semua
        // kasir) TANPA cek kepemilikan sesi — kasir A bisa menutup paksa
        // sesi kasir B (tebak/tahu ID) dan mengirim actual_cash pilihannya
        // sendiri. Tidak ada jalur UI/permission resmi utk "supervisor
        // menutup sesi kasir lain" (itu `CashierSessionService::forceClose()`,
        // HANYA dipakai command terjadwal `session:auto-close`, tidak
        // pernah diekspos lewat HTTP) — jadi dibatasi tegas ke pemilik sesi.
        if ($cashierSession->user_id !== $request->user()->id) {
            abort(403, 'Hanya kasir pemilik sesi yang bisa menutup sesi ini.');
        }

        // Audit Fase 1 (Temuan Kritis #1): BUKAN User::find($approver_id)
        // lagi — token sekali-pakai, lihat AuthorizationService::consumeToken().
        $approver = $this->authorizationService->consumeToken($request->validated('approval_token'), 'pos.approve');

        try {
            $this->sessionService->close(
                $cashierSession,
                (int) $request->validated('actual_cash'),
                $request->validated('reason'),
                $approver,
            );
        } catch (CashDifferenceRequiresApprovalException $e) {
            throw ValidationException::withMessages(['actual_cash' => $e->getMessage()]);
        } catch (SessionCannotCloseWithHoldsException $e) {
            throw ValidationException::withMessages(['actual_cash' => $e->getMessage()]);
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['approval_token' => $e->getMessage()]);
        }

        return back()->with('success', 'Sesi kasir ditutup.');
    }

    public function show(CashierSession $cashierSession)
    {
        try {
            $session = $cashierSession->load([
                'user:id,name,username',
                'cashAccount:id,name',
                'outlet:id,name',
                'cashTransactions' => fn ($q) => $q->with('cashCategory:id,name')->orderByDesc('id'),
                'sales' => function ($query) {
                    $query->with([
                        'items.product:id,name,sku',
                        'payments.paymentMethod:id,name,code,type',
                    ])->orderByDesc('id');
                },
            ]);

            return response()->json([
                'session' => [
                    'id' => $session->id,
                    'reference' => $session->reference,
                    'status' => $session->status,
                    'user_name' => $session->user?->name ?? 'Kasir',
                    'drawer_name' => $session->cashAccount?->name ?? 'Laci Kasir',
                    'outlet_name' => $session->outlet?->name ?? '',
                    'opened_at' => $session->opened_at?->toIso8601String(),
                    'closed_at' => $session->closed_at?->toIso8601String(),
                    'opening_cash' => $session->opening_cash,
                    'total_sales_cash' => $session->total_sales_cash ?? 0,
                    'total_sales_noncash' => $session->total_sales_noncash ?? 0,
                    'total_sales_deposit' => $session->total_sales_deposit ?? 0,
                    'total_sales_credit' => $session->total_sales_credit ?? 0,
                    'total_topup_cash' => $session->total_topup_cash ?? 0,
                    'total_receivable_cash' => $session->total_receivable_cash ?? 0,
                    'total_cash_in' => $session->total_cash_in ?? 0,
                    'total_cash_out' => $session->total_cash_out ?? 0,
                    'expected_cash' => $session->expected_cash,
                    'actual_cash' => $session->actual_cash,
                    'difference' => $session->difference,
                    'difference_reason' => $session->difference_reason ?? $session->note,
                    'notes' => $session->note,
                ],
                'cash_transactions' => $session->cashTransactions->map(fn ($trx) => [
                    'id' => $trx->id,
                    'reference' => $trx->reference,
                    'type' => $trx->type,
                    'amount' => $trx->amount,
                    'category_name' => $trx->cashCategory?->name ?? ($trx->type === 'in' ? 'Kas Masuk' : 'Kas Keluar'),
                    'description' => $trx->description,
                    'created_at' => $trx->created_at?->toIso8601String(),
                ]),
                'sales' => $session->sales->map(fn ($sale) => [
                    'id' => $sale->id,
                    'reference' => $sale->reference,
                    'sale_date' => $sale->sale_date?->toIso8601String(),
                    'grand_total' => $sale->grand_total,
                    'status' => $sale->status,
                    'items' => $sale->items->map(fn ($item) => [
                        'id' => $item->id,
                        'product_name' => $item->product?->name ?? 'Produk',
                        'product_sku' => $item->product?->sku ?? '-',
                        'quantity' => $item->qty,
                        'unit_price' => $item->unit_price,
                        'subtotal' => $item->subtotal,
                    ]),
                    'payments' => $sale->payments->map(fn ($pm) => [
                        'method_name' => $pm->paymentMethod?->name ?? 'Pembayaran',
                        'method_code' => $pm->paymentMethod?->code ?? 'CASH',
                        'method_type' => $pm->paymentMethod?->type ?? 'cash',
                        'amount' => $pm->amount,
                    ]),
                ]),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Gagal memuat detail sesi: '.$e->getMessage(),
            ], 500);
        }
    }
}
