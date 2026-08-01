<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TopupRequest;
use App\Services\GuardianNotificationService;
use App\Services\TopupRequestService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
        $data = $request->validate([
            'bank_verified' => ['required', 'accepted'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $approved = $this->topupRequestService->approve($topupRequest, $request->user(), $request->boolean('bank_verified'), $data['note'] ?? null);
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        if ($approved->guardian) {
            $this->notificationService->topupVerified($approved->guardian, $approved->member, $approved->amount);
        }

        return back()->with('success', "Top-up {$approved->reference} diverifikasi, saldo sudah ditambahkan.");
    }

    /**
     * Temuan audit keamanan: bukti transfer sebelumnya di disk `public`,
     * bisa diakses lewat URL /storage/... tanpa login. Sekarang di disk
     * `local` (private), cuma bisa diakses lewat sini — gate
     * `can:topup.view` di routes/admin.php.
     */
    public function proof(TopupRequest $topupRequest): StreamedResponse
    {
        abort_if($topupRequest->proof_image === null, 404);
        abort_unless(Storage::disk('local')->exists($topupRequest->proof_image), 404);

        return Storage::disk('local')->response($topupRequest->proof_image);
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
