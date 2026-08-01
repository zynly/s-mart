<?php

namespace App\Http\Controllers\Wali;

use App\Http\Controllers\Controller;
use App\Models\DepositTransaction;
use App\Models\Member;
use App\Models\Sale;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class MemberController extends Controller
{
    public function show(Request $request, Member $member): Response
    {
        $guardian = $request->user('guardian');

        if (! $guardian->members()->where('members.id', $member->id)->exists()) {
            throw new NotFoundHttpException;
        }

        $sales = Sale::where('member_id', $member->id)
            ->where('status', 'completed')
            ->latest('sale_date')
            ->limit(10)
            ->get(['id', 'reference', 'sale_date', 'grand_total'])
            ->map(fn ($s) => ['type' => 'belanja', 'reference' => $s->reference, 'date' => $s->sale_date->toIso8601String(), 'amount' => -$s->grand_total]);

        $topups = DepositTransaction::where('member_id', $member->id)
            ->where('type', 'topup')
            ->latest()
            ->limit(10)
            ->get(['id', 'reference', 'created_at', 'amount'])
            ->map(fn ($t) => ['type' => 'topup', 'reference' => $t->reference, 'date' => $t->created_at->toIso8601String(), 'amount' => $t->amount]);

        $riwayat = $sales->concat($topups)->sortByDesc('date')->values()->take(15);

        return Inertia::render('Wali/Members/Show', [
            'member' => [
                'id' => $member->id,
                'name' => $member->name,
                'member_number' => $member->member_number,
                'class_name' => $member->class_name,
                'balance_cache' => $member->balance_cache,
                'photo' => $member->photo,
            ],
            'riwayat' => $riwayat,
        ]);
    }
}
