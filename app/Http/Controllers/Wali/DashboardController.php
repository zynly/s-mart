<?php

namespace App\Http\Controllers\Wali;

use App\Http\Controllers\Controller;
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

        return Inertia::render('Wali/Dashboard', [
            'members' => $members->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'member_number' => $m->member_number,
                'class_name' => $m->class_name,
                'balance_cache' => $m->balance_cache,
                'photo' => $m->photo,
            ]),
        ]);
    }
}
