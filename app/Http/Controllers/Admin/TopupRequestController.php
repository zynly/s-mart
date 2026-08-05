<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TopupRequest;
use App\Services\AuthorizationService;
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
        private readonly AuthorizationService $authorizationService,
    ) {}

    public function index(Request $request): Response
    {
        $topupRequests = TopupRequest::with(['member:id,name,member_number', 'guardian:id,name,phone', 'verifier:id,name'])
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->orderByRaw("FIELD(status, 'pending', 'approved', 'rejected')")
            ->latest()
            ->paginate(20)
            ->withQueryString();

        // REVISI-R1-v2.md §6.3 Jalur B — "tampilkan peringatan bila ada
        // request dengan nominal & tanggal sama" (indikasi bukti
        // dipakai ulang, lintas wali/anak sekalipun — bukan cuma
        // deteksi hash gambar yang sudah dicegah saat submit()).
        // Dihitung per-batch di PHP (bukan subquery SQL) supaya sekali
        // jalan untuk seluruh halaman, bukan N+1 query per baris.
        $duplicateKeys = TopupRequest::query()
            ->selectRaw('amount, transfer_date, COUNT(*) as cnt')
            ->whereNotNull('transfer_date')
            ->groupBy('amount', 'transfer_date')
            ->havingRaw('COUNT(*) > 1')
            ->get()
            // Eloquent tetap menerapkan cast 'transfer_date' => 'date' pada
            // hasil selectRaw() ini (jadi Carbon, bukan string mentah) —
            // WAJIB format toDateString() eksplisit di sini juga supaya
            // kuncinya persis sama dengan yang dibandingkan di bawah,
            // bukan tergantung __toString() default Carbon (yang
            // menyertakan jam:menit:detik dan tidak akan pernah cocok).
            ->map(fn ($row) => $row->amount.'|'.$row->transfer_date->toDateString())
            ->all();

        $topupRequests->getCollection()->transform(function (TopupRequest $tr) use ($duplicateKeys) {
            $tr->setAttribute('is_possible_duplicate', $tr->transfer_date !== null
                && in_array($tr->amount.'|'.$tr->transfer_date->toDateString(), $duplicateKeys, true));

            return $tr;
        });

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
            'approval_token' => ['nullable', 'string'],
        ]);

        // REVISI-R1-v2.md §6.3 Jalur B — nominal besar wajib PIN
        // supervisor/owner sebagai pengaman KEDUA di atas checkbox
        // "sudah cek mutasi rekening" (yang bisa dicentang sembarangan
        // oleh satu admin sendirian).
        $threshold = (int) config('pos.topup_transfer_pin_threshold', 500000);

        if ($topupRequest->amount > $threshold) {
            $approver = $this->authorizationService->consumeToken($data['approval_token'] ?? null, 'topup.approve');

            if ($approver === null) {
                throw ValidationException::withMessages([
                    'approval_token' => "Top-up di atas Rp {$threshold} wajib PIN supervisor/owner.",
                ]);
            }
        }

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

        if ($rejected->guardian) {
            $this->notificationService->topupRejected($rejected->guardian, $rejected->member, $rejected->amount, $rejected->reject_reason);
        }

        return back()->with('success', "Top-up {$rejected->reference} ditolak.");
    }
}
