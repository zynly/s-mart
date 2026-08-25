<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\InsufficientBalanceException;
use App\Exports\DepositAdjustmentExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAdjustmentRequest;
use App\Http\Requests\Admin\StoreTopupRequest;
use App\Http\Requests\Admin\StoreWithdrawalRequest;
use App\Models\DepositTransaction;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Services\AuthorizationService;
use App\Services\DepositService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DepositController extends Controller
{
    public function __construct(
        private readonly DepositService $depositService,
        private readonly AuthorizationService $authorizationService,
    ) {}

    public function index(Request $request): Response
    {
        $transactions = DepositTransaction::query()
            ->with(['member:id,name,member_number', 'paymentMethod:id,name'])
            ->when($request->integer('member_id'), fn ($q, $memberId) => $q->where('member_id', $memberId))
            ->when($request->string('type')->toString(), fn ($q, $type) => $q->where('type', $type))
            ->when($request->date('from'), fn ($q, $from) => $q->where('created_at', '>=', $from->copy()->startOfDay()))
            ->when($request->date('to'), fn ($q, $to) => $q->where('created_at', '<', $to->copy()->addDay()->startOfDay()))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        // REVISI-R1-v2.md §6.2 — Riwayat Penyesuaian Saldo, tab terpisah
        // dari riwayat deposit umum (permintaan "prioritas khusus").
        // Filter sendiri (member_adj/from_adj/to_adj) supaya tidak
        // bentrok dengan filter tab Riwayat di atas saat keduanya dibuka
        // bergantian dalam satu kunjungan halaman.
        $adjustments = DepositTransaction::query()
            ->where('type', 'adjustment')
            ->with(['member:id,name,member_number', 'approver:id,name'])
            ->when($request->integer('member_adj'), fn ($q, $id) => $q->where('member_id', $id))
            ->when($request->date('from_adj'), fn ($q, $from) => $q->where('created_at', '>=', $from->copy()->startOfDay()))
            ->when($request->date('to_adj'), fn ($q, $to) => $q->where('created_at', '<', $to->copy()->addDay()->startOfDay()))
            ->orderByDesc('created_at')
            ->paginate(20, ['*'], 'adj_page')
            ->withQueryString();

        return Inertia::render('Admin/Deposit/Index', [
            'tab' => 'deposit',
            'transactions' => $transactions,
            'adjustments' => $adjustments,
            'members' => Member::where('status', 'active')->orderBy('name')->get(['id', 'name', 'member_number', 'nis', 'balance_cache']),
            'paymentMethods' => PaymentMethod::whereIn('type', ['cash', 'transfer'])->where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'type']),
            'outlets' => Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only('member_id', 'type', 'from', 'to'),
            'adjustmentFilters' => $request->only('member_adj', 'from_adj', 'to_adj'),
            'canWithdraw' => $request->user()->can('withdrawal.create'),
            'canAdjust' => $request->user()->can('deposit.adjust'),
        ]);
    }

    /**
     * REVISI-R1-v2.md §6.2 — ekspor Riwayat Penyesuaian Saldo.
     */
    public function exportAdjustments(Request $request): BinaryFileResponse
    {
        $export = new DepositAdjustmentExport(
            $request->integer('member_adj') ?: null,
            $request->string('from_adj')->toString() ?: null,
            $request->string('to_adj')->toString() ?: null,
        );

        return Excel::download($export, 'penyesuaian-saldo-'.now()->format('Ymd-His').'.xlsx');
    }

    public function storeTopup(StoreTopupRequest $request): RedirectResponse
    {
        $member = Member::findOrFail($request->validated('member_id'));
        $amount = (int) $request->validated('amount');
        $paymentMethod = PaymentMethod::findOrFail($request->validated('payment_method_id'));

        // REVISI-R1-v2.md §6.3 (Jalur A — top-up TUNAI di kasir): di atas
        // ambang, kasir sendirian tidak cukup — perlu bukti PIN
        // supervisor sebagai pengaman kedua (di luar rekonsiliasi kas
        // saat tutup sesi, yang baru ketahuan belakangan).
        $threshold = (int) config('pos.topup_cash_pin_threshold', 200000);

        if ($paymentMethod->type === 'cash' && $amount > $threshold) {
            // 'topup.approve' (owner/admin/treasurer) — BUKAN
            // 'deposit.adjust' yang eksklusif owner (lihat storeAdjustment()
            // di bawah); ambang top-up butuh approver yang lebih luas,
            // permission yang sudah ada persis untuk konteks top-up.
            $approver = $this->authorizationService->consumeToken($request->validated('approval_token'), 'topup.approve');

            if ($approver === null) {
                throw ValidationException::withMessages([
                    'approval_token' => "Top-up tunai di atas Rp {$threshold} wajib PIN supervisor.",
                ]);
            }
        }

        $this->depositService->topup(
            $member,
            (int) $request->validated('amount'),
            (int) $request->validated('payment_method_id'),
            (string) ($request->header('X-Idempotency-Key') ?: \Illuminate\Support\Str::uuid()),
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
                (string) ($request->header('X-Idempotency-Key') ?: \Illuminate\Support\Str::uuid()),
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

        // REVISI-R1-v2.md §6.2 — PIN owner wajib diverifikasi ulang untuk
        // AKSI INI SENDIRI (token sekali-pakai, TTL pendek), bukan cukup
        // sesi login owner yang sedang aktif.
        $approver = $this->authorizationService->consumeToken($request->validated('approval_token'), 'deposit.adjust');

        if ($approver === null) {
            throw ValidationException::withMessages(['approval_token' => 'Verifikasi PIN owner gagal atau kedaluwarsa — ulangi.']);
        }

        try {
            $this->depositService->adjust(
                $member,
                (int) $request->validated('amount'),
                $request->validated('reason'),
                $request->user(),
                (string) ($request->header('X-Idempotency-Key') ?: \Illuminate\Support\Str::uuid()),
            );
        } catch (InsufficientBalanceException $e) {
            throw ValidationException::withMessages(['amount' => $e->getMessage()]);
        }

        return back()->with('success', 'Penyesuaian saldo berhasil.');
    }
}
