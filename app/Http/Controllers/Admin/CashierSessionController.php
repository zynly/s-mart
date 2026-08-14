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
        $active = $this->sessionService->getActive($request->user());

        return Inertia::render('Admin/CashierSession/Index', [
            'tab' => 'cashier-session',
            'active' => $active?->load('cashAccount:id,name'),
            'expected' => $active !== null ? $this->sessionService->calculateExpected($active) : null,
            'cashAccounts' => CashAccount::where('is_drawer', true)->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'current_balance', 'is_default', 'outlet_id']),
            'outlets' => \App\Models\Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'activeSales' => $active !== null
                ? Sale::where('cashier_session_id', $active->id)
                    ->orderByDesc('id')
                    ->get(['id', 'reference', 'sale_date', 'grand_total', 'status', 'voided_at'])
                : [],
            'recentSessions' => CashierSession::where('user_id', $request->user()->id)
                ->where('status', '!=', 'open')
                ->orderByDesc('closed_at')
                ->limit(10)
                ->get(['id', 'reference', 'opened_at', 'closed_at', 'opening_cash', 'expected_cash', 'actual_cash', 'difference', 'status']),
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

        return back()->with('success', 'Sesi kasir dibuka.');
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
}
