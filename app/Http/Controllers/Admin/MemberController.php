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
use App\Services\PointService;
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
        private readonly PointService $pointService,
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
            ->when($request->string('class_name')->toString(), fn ($q, $class) => $q->where(
                fn ($sub) => $sub->where('class_name', $class)->orWhere('class_name', 'like', "{$class} %")
            ))
            ->when($request->string('major')->toString(), fn ($q, $major) => $q->where('major', $major))
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        $stats = Member::query()
            ->selectRaw("
                COUNT(*) as total_members,
                COUNT(*) FILTER (WHERE type = 'santri') as total_santri,
                COUNT(*) FILTER (WHERE type = 'fasilitator') as total_fasilitator,
                COUNT(*) FILTER (WHERE type IN ('staff', 'public')) as total_staff,
                COALESCE(SUM(balance_cache), 0) as total_deposit,
                COALESCE(SUM(point_balance), 0) as total_points,
                COUNT(*) FILTER (WHERE status = 'active') as active_members
            ")
            ->first()
            ?->toArray() ?? [
                'total_members' => 0,
                'total_santri' => 0,
                'total_fasilitator' => 0,
                'total_staff' => 0,
                'total_deposit' => 0,
                'total_points' => 0,
                'active_members' => 0,
            ];

        return Inertia::render('Admin/Members/Index', [
            'tab' => 'members',
            'members' => $members,
            'stats' => $stats,
            'levels' => \Illuminate\Support\Facades\Cache::remember('dropdown_member_levels', 3600, fn () => MemberLevel::where('is_active', true)->orderBy('name')->get(['id', 'name'])),
            'categories' => \Illuminate\Support\Facades\Cache::remember('dropdown_categories', 3600, fn () => Category::orderBy('name')->get(['id', 'name'])),
            'majors' => ['BD', 'PPLG', 'UPT', 'TKP'],
            'classes' => ['X', 'XI', 'XII'],
            'filters' => $request->only('search', 'type', 'status', 'class_name', 'major'),
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
        $this->pinService->resetToDefault($member);

        return back()->with('success', 'PIN anggota direset ke 123456.');
    }

    public function adjustPoints(Request $request, Member $member): RedirectResponse
    {
        $validated = $request->validate([
            'points' => ['required', 'integer', 'min:0'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $this->pointService->adjust(
            $member,
            (int) $validated['points'],
            $validated['note'] ?: 'Penyesuaian manual poin anggota'
        );

        return back()->with('success', 'Saldo poin anggota berhasil disesuaikan.');
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
        $ids = $request->input('ids');
        if (is_string($ids)) {
            $ids = array_filter(explode(',', $ids));
        }

        $query = Member::query();
        if (!empty($ids) && is_array($ids)) {
            $query->whereIn('id', $ids);
        } else {
            $query->where('status', 'active');
        }

        $members = $query->orderBy('name')->get();
        if ($members->isEmpty()) {
            abort(404, 'Tidak ada data anggota untuk dicetak.');
        }

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
        $pdf = $this->cardPrintService->previewCard($member);

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
                'note'            => $d->note,
                'description'     => $d->note,
                'payment_method'  => $d->paymentMethod ? ['id' => $d->paymentMethod->id, 'name' => $d->paymentMethod->name] : null,
                'user'            => $d->user ? ['id' => $d->user->id, 'name' => $d->user->name] : null,
                'approver'        => $d->approver ? ['id' => $d->approver->id, 'name' => $d->approver->name] : null,
                'kasir'           => $d->user?->name,
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
                    'note'            => 'Pembelian Faktur #' . $s->reference,
                    'description'     => 'Pembelian Faktur #' . $s->reference,
                    'grand_total'     => $s->grand_total,
                    'status'          => $s->status,
                    'payment_methods' => $s->payments->map(fn ($p) => $p->paymentMethod?->name ?? 'Tunai')->unique()->values(),
                    'user'            => $s->user ? ['id' => $s->user->id, 'name' => $s->user->name] : null,
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
            'transactions' => [
                'data'         => $merged,
                'current_page' => 1,
                'last_page'    => 1,
                'total'        => $merged->count(),
            ],
        ]);
    }
}

