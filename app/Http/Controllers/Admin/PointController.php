<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\PointTransaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PointController extends Controller
{
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
}
