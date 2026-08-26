<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\InsufficientCashBalanceException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCashAccountRequest;
use App\Http\Requests\Admin\StoreCashTransactionRequest;
use App\Http\Requests\Admin\TransferCashRequest;
use App\Models\CashAccount;
use App\Models\CashCategory;
use App\Models\CashierSession;
use App\Models\CashTransaction;
use App\Models\Member;
use App\Models\Outlet;
use App\Services\CashierSessionService;
use App\Services\CashService;
use App\Services\DepositService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CashController extends Controller
{
    public function __construct(
        private readonly CashService $cashService,
        private readonly CashierSessionService $sessionService,
        private readonly DepositService $depositService,
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

        $activeSession = $this->sessionService->getActive($request->user());
        $expectedCash = $activeSession ? $this->sessionService->calculateExpected($activeSession) : null;

        $accounts = CashAccount::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'current_balance', 'is_drawer'])
            ->map(function ($acc) use ($activeSession, $expectedCash) {
                return [
                    'id' => $acc->id,
                    'name' => $acc->name,
                    'type' => $acc->type,
                    'current_balance' => ($acc->is_drawer && $activeSession && $activeSession->cash_account_id === $acc->id)
                        ? $expectedCash
                        : $acc->current_balance,
                    'is_drawer' => $acc->is_drawer,
                ];
            });

        return Inertia::render('Admin/Cash/Index', [
            'tab' => 'cash',
            'transactions' => $transactions,
            'accounts' => $accounts,
            'categories' => CashCategory::where('is_active', true)->orderBy('name')->get(['id', 'name', 'type']),
            // REVISI-R1-v2.md §1.7 — Kelola Laci: SEMUA akun kas (termasuk
            // yang nonaktif, supaya bisa diaktifkan kembali), lintas outlet
            // (halaman ini sendiri yang jadi tempat kelola per-outlet).
            'allAccounts' => CashAccount::withoutGlobalScope('outlet')->with('outlet:id,name')->orderBy('name')->get(),
            'outlets' => Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only('cash_account_id', 'type'),
        ]);
    }

    /**
     * REVISI-R1-v2.md §1.7 — Kelola Laci (tambah/ubah akun kas per outlet).
     */
    public function storeAccount(StoreCashAccountRequest $request): RedirectResponse
    {
        CashAccount::create($request->validated());

        return back()->with('success', 'Akun kas berhasil dibuat.');
    }

    public function updateAccount(StoreCashAccountRequest $request, CashAccount $cashAccount): RedirectResponse
    {
        $wasActive = $cashAccount->is_active;
        $data = $request->validated();

        // Laci yang sedang dipakai sesi kasir TERBUKA tidak boleh
        // dinonaktifkan — kasir yang sedang bertransaksi akan kehilangan
        // rujukan lacinya di tengah shift.
        if ($wasActive && ($data['is_active'] ?? true) === false) {
            $hasOpenSession = CashierSession::withoutGlobalScope('outlet')
                ->where('cash_account_id', $cashAccount->id)
                ->where('status', 'open')
                ->exists();

            if ($hasOpenSession) {
                throw ValidationException::withMessages([
                    'is_active' => 'Laci ini sedang dipakai sesi kasir yang masih terbuka — tidak bisa dinonaktifkan.',
                ]);
            }
        }

        $cashAccount->update($data);

        return back()->with('success', 'Akun kas berhasil diperbarui.');
    }

    public function bulkUpdateAccounts(Request $request): RedirectResponse
    {
        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:cash_accounts,id'],
            'action' => ['required', 'string', 'in:activate,deactivate'],
        ]);

        $ids = $request->input('ids');
        $action = $request->input('action');
        $isActive = $action === 'activate';

        if (! $isActive) {
            $hasOpenSession = CashierSession::withoutGlobalScope('outlet')
                ->whereIn('cash_account_id', $ids)
                ->where('status', 'open')
                ->exists();

            if ($hasOpenSession) {
                return back()->with('error', 'Salah satu laci yang dipilih sedang dipakai sesi kasir yang masih terbuka.');
            }
        }

        CashAccount::whereIn('id', $ids)->update(['is_active' => $isActive]);

        return back()->with('success', count($ids).' Akun kas berhasil diubah statusnya.');
    }

    public function storeIn(StoreCashTransactionRequest $request): RedirectResponse
    {
        $session = $this->sessionService->getActive($request->user());
        if (! $session) {
            throw ValidationException::withMessages([
                'cash_account_id' => 'Sesi kasir aktif tidak ditemukan. Buka sesi kasir terlebih dahulu untuk mencatat kas masuk.',
            ]);
        }

        $account = CashAccount::findOrFail($request->validated('cash_account_id'));

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
        $session = $this->sessionService->getActive($request->user());
        if (! $session) {
            throw ValidationException::withMessages([
                'cash_account_id' => 'Sesi kasir aktif tidak ditemukan. Buka sesi kasir terlebih dahulu untuk mencatat kas keluar.',
            ]);
        }

        $account = CashAccount::findOrFail($request->validated('cash_account_id'));

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

    public function storeMemberWithdrawal(Request $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'member_id' => ['required', 'integer', 'exists:members,id'],
            'amount' => ['required', 'integer', 'min:1000'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $member = Member::findOrFail($validated['member_id']);
        $amount = (int) $validated['amount'];
        $user = $request->user();

        // Cek sesi kasir aktif
        $session = $this->sessionService->getActive($user);
        if (! $session) {
            throw ValidationException::withMessages([
                'member_id' => 'Sesi kasir aktif tidak ditemukan. Silakan buka sesi kasir terlebih dahulu.',
            ]);
        }

        // Cek saldo deposit anggota
        if ($member->balance_cache < $amount) {
            throw ValidationException::withMessages([
                'amount' => "Saldo deposit {$member->name} (Rp " . number_format($member->balance_cache, 0, ',', '.') . ") tidak mencukupi untuk tarik tunai Rp " . number_format($amount, 0, ',', '.') . ".",
            ]);
        }

        // Cek saldo laci kasir
        $drawer = $session->cashAccount ?? CashAccount::find($session->cash_account_id);
        if (! $drawer) {
            throw ValidationException::withMessages([
                'amount' => 'Akun kas / laci untuk sesi kasir ini tidak ditemukan.',
            ]);
        }

        $cashOnHand = $this->sessionService->calculateExpected($session);
        if ($cashOnHand < $amount) {
            throw ValidationException::withMessages([
                'amount' => "Saldo laci kasir (Cash On Hand: Rp " . number_format($cashOnHand, 0, ',', '.') . ") tidak mencukupi untuk mengeluarkan tunai Rp " . number_format($amount, 0, ',', '.') . ".",
            ]);
        }

        $idempotencyKey = (string) ($request->header('X-Idempotency-Key') ?? Str::uuid());

        // Kategori kas keluar
        $category = CashCategory::firstOrCreate(
            ['code' => 'TARIK_DEPOSIT'],
            [
                'name' => 'Tarik Tunai Deposit Anggota',
                'type' => 'out',
                'is_system' => true,
                'is_active' => true,
            ]
        );

        try {
            DB::transaction(function () use ($member, $amount, $user, $session, $drawer, $category, $idempotencyKey, $validated) {
                // 1. Potong saldo deposit anggota
                $this->depositService->withdraw(
                    $member,
                    $amount,
                    $user,
                    $idempotencyKey,
                    $validated['note'] ?? "Tarik tunai deposit di kasir oleh {$member->name}",
                    $session->outlet_id,
                    $session->id
                );

                // 2. Catat kas keluar dari laci kasir
                $this->cashService->recordOut(
                    $drawer,
                    $amount,
                    $category->id,
                    "Tarik tunai deposit: {$member->name} ({$member->member_number})",
                    $session
                );
            });
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'amount' => 'Gagal memproses penarikan saldo: '.$e->getMessage(),
            ]);
        }

        if ($request->wantsJson() || $request->header('X-Inertia')) {
            return back()->with('success', "Tarik tunai Rp " . number_format($amount, 0, ',', '.') . " berhasil untuk {$member->name}.");
        }

        return response()->json([
            'success' => true,
            'message' => "Tarik tunai Rp " . number_format($amount, 0, ',', '.') . " berhasil untuk {$member->name}.",
            'new_balance' => $member->fresh()->balance_cache,
        ]);
    }
}
