<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\PointTransaction;
use App\Services\PointService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PointController extends Controller
{
    public function __construct(private readonly PointService $pointService) {}

    public function index(Request $request): Response
    {
        $transactions = PointTransaction::query()
            ->with(['member:id,name,member_number', 'sale:id,reference'])
            ->when($request->integer('member_id'), fn ($q, $id) => $q->where('member_id', $id))
            ->when($request->string('type')->toString(), fn ($q, $type) => $q->where('type', $type))
            ->orderByDesc('id')
            ->paginate(30)
            ->withQueryString();

        return Inertia::render('Admin/Points/Index', [
            'tab' => 'points',
            'transactions' => $transactions,
            'members' => Member::where('status', 'active')->orderBy('name')->get(['id', 'name', 'member_number', 'point_balance']),
            'filters' => $request->only('member_id', 'type'),
        ]);
    }

    public function adjust(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'member_id' => ['required', 'exists:members,id'],
            'points' => ['required', 'integer', 'min:0'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $member = Member::findOrFail($validated['member_id']);
        $this->pointService->adjust(
            $member,
            (int) $validated['points'],
            $validated['note'] ?: 'Penyesuaian manual poin'
        );

        return back()->with('success', "Poin anggota {$member->name} berhasil disesuaikan menjadi {$validated['points']} poin.");
    }

    public function bulkReset(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $affected = $this->pointService->bulkReset($validated['note'] ?: 'Reset poin massal periode');

        return back()->with('success', "Poin dari {$affected} anggota berhasil direset menjadi 0.");
    }
}
