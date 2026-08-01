<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TopupRequest;
use App\Services\GuardianNotificationService;
use App\Services\TopupRequestService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * T-098 (Fase 16). Verifikasi top-up wali TANPA sesi kasir aktif
 * (ADR-0010) — beda dari `DepositController::storeTopup()` yang
 * instan lewat kasir.
 */
class TopupRequestController extends Controller
{
    public function __construct(
        private readonly TopupRequestService $topupRequestService,
        private readonly GuardianNotificationService $notificationService,
    ) {}

    public function index(Request $request): Response
    {
        $topupRequests = TopupRequest::with(['member:id,name,member_number', 'guardian:id,name,phone', 'verifier:id,name'])
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->orderByRaw("FIELD(status, 'pending', 'approved', 'rejected')")
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/TopupRequests/Index', [
            'tab' => 'topup-requests',
            'topupRequests' => $topupRequests,
            'filters' => $request->only('status'),
        ]);
    }

    public function approve(TopupRequest $topupRequest, Request $request): RedirectResponse
    {
        try {
            $approved = $this->topupRequestService->approve($topupRequest, $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        if ($approved->guardian) {
            $this->notificationService->topupVerified($approved->guardian, $approved->member, $approved->amount);
        }

        return back()->with('success', "Top-up {$approved->reference} diverifikasi, saldo sudah ditambahkan.");
    }

    public function reject(TopupRequest $topupRequest, Request $request): RedirectResponse
    {
        $data = $request->validate(['reject_reason' => ['required', 'string', 'max:255']]);

        try {
            $rejected = $this->topupRequestService->reject($topupRequest, $request->user(), $data['reject_reason']);
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return back()->with('success', "Top-up {$rejected->reference} ditolak.");
    }
}
