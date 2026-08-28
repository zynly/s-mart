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

        $identity = trim($data['identity']);
        $lower = mb_strtolower($identity);

        // Cari berdasarkan NIS, Nomor Anggota, atau Nama Lengkap (Case-Insensitive)
        $member = Member::where('status', 'active')
            ->where(function ($query) use ($identity, $lower) {
                $query->where('nis', $identity)
                    ->orWhere('member_number', $identity)
                    ->orWhereRaw('LOWER(name) = ?', [$lower]);
            })
            ->first();

        // Jika tidak ditemukan dengan exact match, coba cari LIKE (nama mirip)
        if ($member === null && mb_strlen($identity) >= 3) {
            $member = Member::where('status', 'active')
                ->whereRaw('LOWER(name) LIKE ?', ["%{$lower}%"])
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

