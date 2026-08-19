<?php

namespace App\Http\Controllers\Wali;

use App\Http\Controllers\Controller;
use App\Services\PaymentGatewayService;
use App\Services\TopupRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class TopupController extends Controller
{
    public function __construct(
        private readonly TopupRequestService $topupRequestService,
        private readonly PaymentGatewayService $paymentGatewayService,
    ) {}

    public function create(Request $request): Response
    {
        $guardian = $request->user('guardian');

        return Inertia::render('Wali/Topup/Create', [
            'members' => $guardian->members()->where('status', 'active')->get(['members.id', 'members.name', 'members.member_number']),
            'midtransClientKey' => config('services.midtrans.client_key'),
            'midtransIsProduction' => (bool) config('services.midtrans.is_production'),
            'activeGateway' => $this->paymentGatewayService->getActiveProvider(),
            'minTopup' => (int) config('pos.deposit_min_topup'),
            'allowAutoTopup' => (bool) config('pos.allow_auto_topup', true),
            'allowManualTopup' => (bool) config('pos.allow_manual_topup', true),
            'manualBankName' => (string) config('pos.manual_bank_name', 'BSI (Bank Syariah Indonesia)'),
            'manualBankAccountNumber' => (string) config('pos.manual_bank_account_number', '7123456789'),
            'manualBankAccountName' => (string) config('pos.manual_bank_account_name', 'SMK Skill Village Islamic School'),
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

    /**
     * Alur "Bayar Otomatis" (Midtrans Snap) — beda dari store() manual:
     * dipanggil via fetch() JSON (bukan Inertia post), karena frontend
     * butuh `token` balik untuk memanggil `snap.pay()`, bukan redirect
     * halaman penuh.
     */
    public function storeMidtrans(Request $request): JsonResponse
    {
        $guardian = $request->user('guardian');

        $data = $request->validate([
            'member_id' => ['required', 'integer'],
            'amount' => ['required', 'integer', 'min:'.(int) config('pos.deposit_min_topup')],
        ]);

        $member = $guardian->members()->where('members.id', $data['member_id'])->first();

        if (! $member) {
            throw new NotFoundHttpException;
        }

        $topupRequest = $this->topupRequestService->createForGateway($guardian, $member, $data['amount']);

        $result = $this->paymentGatewayService->createTransaction(
            $topupRequest->reference,
            $topupRequest->amount,
            array_filter([
                'first_name' => $guardian->name,
                'email' => $guardian->email,
                'phone' => $guardian->phone,
            ]),
            [
                ['id' => 'topup', 'price' => $topupRequest->amount, 'quantity' => 1, 'name' => "Top-Up Saldo {$member->name}"],
            ],
        );

        if (! empty($result['token'])) {
            $topupRequest->update(['snap_token' => $result['token']]);
        }

        return response()->json([
            'provider'    => $result['provider'],
            'token'       => $result['token'] ?? null,
            'payment_url' => $result['payment_url'] ?? null,
            'reference'   => $topupRequest->reference,
        ]);
    }
}
