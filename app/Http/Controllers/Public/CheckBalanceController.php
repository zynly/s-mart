<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Member;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CheckBalanceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Public/CheckBalance');
    }

    public function check(Request $request): Response
    {
        $data = $request->validate([
            'identity' => ['required', 'string', 'max:100'],
        ], [
            'identity.required' => 'Masukkan NIS atau Nama Santri/Anggota.',
        ]);

        $identity = trim(preg_replace('/\s+/', ' ', $data['identity']));
        $lower = mb_strtolower($identity);

        $columns = ['id', 'name', 'nis', 'member_number', 'class_name', 'major', 'type', 'balance_cache', 'point_balance'];

        // 1. Tier 1: Exact Match (NIS, Nomor Anggota, atau Nama Lengkap Persis)
        $member = Member::select($columns)
            ->where('status', 'active')
            ->where(function ($query) use ($identity, $lower) {
                $query->where('nis', $identity)
                    ->orWhere('member_number', $identity)
                    ->orWhereRaw('LOWER(name) = ?', [$lower]);
            })
            ->first();

        // 2. Tier 2: Prefix Match (Nama Depan / Awalan Kata)
        if ($member === null && mb_strlen($identity) >= 2) {
            $member = Member::select($columns)
                ->where('status', 'active')
                ->where('name', 'ilike', "{$identity}%")
                ->first();
        }

        // 3. Tier 3: Substring Trigram Match (Mengandung Kata / Suku Kata di Tengah)
        if ($member === null && mb_strlen($identity) >= 3) {
            $member = Member::select($columns)
                ->where('status', 'active')
                ->where('name', 'ilike', "%{$identity}%")
                ->first();
        }

        if ($member === null) {
            return Inertia::render('Public/CheckBalance', [
                'error' => 'Data anggota dengan NIS atau Nama tersebut tidak ditemukan.',
                'submittedIdentity' => $identity,
            ]);
        }

        return Inertia::render('Public/CheckBalance', [
            'result' => [
                'name' => $member->name,
                'nis' => $member->nis,
                'member_number' => $member->member_number,
                'class_name' => $member->class_name,
                'major' => $member->major,
                'type' => $member->type,
                'balance' => $member->balance_cache,
                'point_balance' => $member->point_balance,
            ],
            'submittedIdentity' => $identity,
        ]);
    }
}

