<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\WeakPinException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SetMemberPinRequest;
use App\Http\Requests\Admin\StoreMemberRequest;
use App\Http\Requests\Admin\UpdateMemberRequest;
use App\Models\Category;
use App\Models\Member;
use App\Models\MemberLevel;
use App\Services\CardPrintService;
use App\Services\CardService;
use App\Services\MemberPinService;
use App\Services\MemberService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MemberController extends Controller
{
    public function __construct(
        private readonly MemberService $memberService,
        private readonly CardService $cardService,
        private readonly MemberPinService $pinService,
        private readonly CardPrintService $cardPrintService,
    ) {}

    public function index(Request $request): Response
    {
        $members = Member::query()
            ->with(['level:id,name,color', 'activeCard', 'guardians:id,name,phone,is_active'])
            ->when($request->string('search')->toString(), fn ($q, $search) => $q->where(
                fn ($sub) => $sub->where('name', 'ilike', "%{$search}%")
                    ->orWhere('member_number', 'ilike', "%{$search}%")
                    ->orWhere('nis', 'ilike', "%{$search}%")
            ))
            ->when($request->string('type')->toString(), fn ($q, $type) => $q->where('type', $type))
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->when($request->string('class_name')->toString(), fn ($q, $class) => $q->where('class_name', $class))
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Members/Index', [
            'tab' => 'members',
            'members' => $members,
            'levels' => MemberLevel::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'filters' => $request->only('search', 'type', 'status', 'class_name'),
        ]);
    }

    public function store(StoreMemberRequest $request): RedirectResponse
    {
        $this->memberService->create($request->validated());

        return back()->with('success', 'Anggota berhasil dibuat.');
    }

    public function update(UpdateMemberRequest $request, Member $member): RedirectResponse
    {
        $this->memberService->update($member, $request->validated());

        return back()->with('success', 'Data anggota diperbarui.');
    }

    public function destroy(Member $member): RedirectResponse
    {
        $member->update(['status' => 'inactive']);
        $member->delete();

        return back()->with('success', 'Anggota dinonaktifkan.');
    }

    public function resetPin(Member $member): RedirectResponse
    {
        $this->pinService->reset($member);

        return back()->with('success', 'PIN anggota direset. Anggota akan diminta buat PIN baru saat transaksi berikutnya.');
    }

    /**
     * Audit Fase 5: jalur BARU untuk membuat/mengganti PIN anggota —
     * sebelumnya tidak ada sama sekali (lihat SetMemberPinRequest).
     * Dipakai baik utk anggota baru (belum pernah punya PIN) maupun
     * mengganti PIN yang sudah ada (admin/staf dgn izin member.update).
     */
    public function setPin(SetMemberPinRequest $request, Member $member): RedirectResponse
    {
        try {
            $this->pinService->set($member, $request->validated('pin'));
        } catch (WeakPinException $e) {
            throw ValidationException::withMessages(['pin' => $e->getMessage()]);
        }

        return back()->with('success', 'PIN anggota berhasil disimpan.');
    }

    public function reissueCard(Request $request, Member $member): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        $this->cardService->reissue($member, $data['reason']);

        return back()->with('success', 'Kartu baru berhasil diterbitkan.');
    }

    public function printCards(Request $request): HttpResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:members,id'],
        ]);

        $members = Member::whereIn('id', $data['ids'])->get();
        $pdf = $this->cardPrintService->printCards($members);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="kartu-anggota.pdf"',
        ]);
    }

    /**
     * REVISI-R1-v2.md §9.3 — pratinjau satu kartu sebelum cetak massal.
     */
    public function previewCard(Member $member): HttpResponse
    {
        try {
            $pdf = $this->cardPrintService->previewCard($member);
        } catch (\DomainException $e) {
            abort(422, $e->getMessage());
        }

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="pratinjau-kartu-'.$member->member_number.'.pdf"',
        ]);
    }

    /**
     * Riwayat transaksi gabungan per anggota:
     * deposit (topup/bonus/refund), pembelian (sale/purchase),
     * dan tarik tunai/penarikan (withdrawal/closing).
     * Diurut berdasarkan waktu terbaru.
     */
    public function transactions(Request $request, Member $member): \Illuminate\Http\JsonResponse
    {
        $type = $request->string('type')->toString();

        // ───────────────────────────────────────────────
        // 1. Riwayat Deposit (DepositTransaction)
        // ───────────────────────────────────────────────
        $depositQuery = \App\Models\DepositTransaction::query()
            ->where('member_id', $member->id)
            ->with([
                'paymentMethod:id,name',
                'user:id,name',
                'approver:id,name',
                'cashierSession:id,reference',
            ])
            ->when($type, function ($q, $t) {
                if ($t === 'topup') {
                    $q->whereIn('type', ['topup', 'bonus', 'refund', 'adjustment']);
                } elseif ($t === 'purchase') {
                    $q->where('type', 'purchase');
                } elseif ($t === 'withdrawal') {
                    $q->whereIn('type', ['withdrawal', 'closing']);
                }
            });

        $depositRows = $depositQuery->orderByDesc('created_at')->limit(100)->get()
            ->map(fn ($d) => [
                'id'              => "dep-{$d->id}",
                'kind'            => 'deposit',
                'type'            => $d->type,
                'amount'          => $d->amount,
                'balance_before'  => $d->balance_before,
                'balance_after'   => $d->balance_after,
                'reference'       => $d->reference,
                'description'     => $d->note,
                'payment_method'  => $d->paymentMethod?->name,
                'kasir'           => $d->user?->name,
                'approver'        => $d->approver?->name,
                'session_ref'     => $d->cashierSession?->reference,
                'created_at'      => $d->created_at?->toIso8601String(),
            ]);

        // ───────────────────────────────────────────────
        // 2. Riwayat Pembelian (Sale) — hanya jika filter = '' atau 'purchase'
        // ───────────────────────────────────────────────
        $saleRows = collect();
        if ($type === '' || $type === 'purchase') {
            $saleRows = \App\Models\Sale::query()
                ->where('member_id', $member->id)
                ->with([
                    'payments.paymentMethod:id,name,type',
                    'cashierSession:id,reference',
                    'user:id,name',
                ])
                ->orderByDesc('created_at')
                ->limit(100)
                ->get()
                ->map(fn ($s) => [
                    'id'              => "sale-{$s->id}",
                    'kind'            => 'sale',
                    'type'            => $s->status === 'void' ? 'void' : 'purchase',
                    'amount'          => -abs($s->grand_total), // kas keluar dari saldo member (jika deposit)
                    'balance_before'  => null,
                    'balance_after'   => null,
                    'reference'       => $s->reference,
                    'description'     => 'Pembelian ' . ($s->items_count ?? '') . ' item',
                    'grand_total'     => $s->grand_total,
                    'status'          => $s->status,
                    'payment_methods' => $s->payments->map(fn ($p) => $p->paymentMethod?->name ?? 'Tunai')->unique()->values(),
                    'kasir'           => $s->user?->name,
                    'session_ref'     => $s->cashierSession?->reference,
                    'created_at'      => $s->created_at?->toIso8601String(),
                ]);
        }

        // ───────────────────────────────────────────────
        // 3. Gabungkan, urutkan, ambil 50 terbaru
        // ───────────────────────────────────────────────
        $merged = $depositRows->merge($saleRows)
            ->sortByDesc('created_at')
            ->values()
            ->take(50);

        return response()->json([
            'member' => [
                'id'            => $member->id,
                'name'          => $member->name,
                'member_number' => $member->member_number,
                'nis'           => $member->nis,
                'balance_cache' => $member->balance_cache,
                'point_balance' => $member->point_balance,
            ],
            'transactions' => $merged,
        ]);
    }
}

