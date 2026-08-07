<?php

namespace App\Http\Controllers\Wali;

use App\Http\Controllers\Controller;
use App\Models\DepositTransaction;
use App\Models\Sale;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $guardian = $request->user('guardian');

        $members = $guardian->members()
            ->where('status', 'active')
            ->get(['members.id', 'members.name', 'members.member_number', 'members.class_name', 'members.balance_cache', 'members.photo']);

        $memberIds = $members->pluck('id')->toArray();

        $todaySpent = Sale::whereIn('member_id', $memberIds)
            ->where('status', 'completed')
            ->whereDate('sale_date', now()->today())
            ->sum('grand_total');

        $monthSpent = Sale::whereIn('member_id', $memberIds)
            ->where('status', 'completed')
            ->whereMonth('sale_date', now()->month)
            ->whereYear('sale_date', now()->year)
            ->sum('grand_total');

        $totalBalance = $members->sum('balance_cache');

        $sales = Sale::whereIn('member_id', $memberIds)
            ->where('status', 'completed')
            ->latest('sale_date')
            ->limit(5)
            ->with('member:id,name')
            ->get(['id', 'reference', 'member_id', 'sale_date', 'grand_total'])
            ->map(fn ($s) => [
                'id' => 'sale-'.$s->id,
                'child_name' => $s->member?->name ?? 'Anak',
                'type' => 'belanja',
                'title' => 'Belanja di Kasir',
                'reference' => $s->reference,
                'date' => $s->sale_date->toIso8601String(),
                'amount' => -$s->grand_total,
            ]);

        $topups = DepositTransaction::whereIn('member_id', $memberIds)
            ->where('type', 'topup')
            ->latest()
            ->limit(5)
            ->with('member:id,name')
            ->get(['id', 'reference', 'member_id', 'created_at', 'amount'])
            ->map(fn ($t) => [
                'id' => 'topup-'.$t->id,
                'child_name' => $t->member?->name ?? 'Anak',
                'type' => 'topup',
                'title' => 'Top-Up Saldo',
                'reference' => $t->reference,
                'date' => $t->created_at->toIso8601String(),
                'amount' => (int) $t->amount,
            ]);

        $recentActivities = $sales->concat($topups)
            ->sortByDesc('date')
            ->values()
            ->take(5);

        return Inertia::render('Wali/Dashboard', [
            'members' => $members->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'member_number' => $m->member_number,
                'class_name' => $m->class_name,
                'balance_cache' => (int) $m->balance_cache,
                'photo' => $m->photo,
            ]),
            'kpi' => [
                'total_balance' => (int) $totalBalance,
                'today_spent' => (int) $todaySpent,
                'month_spent' => (int) $monthSpent,
                'total_children' => $members->count(),
            ],
            'recentActivities' => $recentActivities,
        ]);
    }
}
