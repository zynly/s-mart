<?php

namespace App\Http\Controllers\Wali;

use App\Http\Controllers\Controller;
use App\Services\TopupRequestService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class TopupController extends Controller
{
    public function __construct(private readonly TopupRequestService $topupRequestService) {}

    public function create(Request $request): Response
    {
        $guardian = $request->user('guardian');

        return Inertia::render('Wali/Topup/Create', [
            'members' => $guardian->members()->where('status', 'active')->get(['members.id', 'members.name', 'members.member_number']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $guardian = $request->user('guardian');

        $data = $request->validate([
            'member_id' => ['required', 'integer'],
            'amount' => ['required', 'integer', 'min:10000'],
            'proof_image' => ['required', 'image', 'max:4096'],
            'bank_name' => ['nullable', 'string', 'max:100'],
            'sender_name' => ['nullable', 'string', 'max:100'],
            'transfer_date' => ['nullable', 'date'],
        ]);

        $member = $guardian->members()->where('members.id', $data['member_id'])->first();

        if (! $member) {
            throw new NotFoundHttpException;
        }

        $topupRequest = $this->topupRequestService->submit(
            $guardian,
            $member,
            $data['amount'],
            $request->file('proof_image'),
            $data['bank_name'] ?? null,
            $data['sender_name'] ?? null,
            $data['transfer_date'] ?? null,
        );

        return redirect()->route('wali.dashboard')->with('success', "Pengajuan top-up {$topupRequest->reference} terkirim, menunggu verifikasi admin.");
    }
}
