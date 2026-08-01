<?php

namespace App\Services;

use App\Models\Guardian;
use App\Models\Member;
use App\Models\TopupRequest;
use App\Models\User;
use App\Support\ReferenceGenerator;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * T-097/T-098 (Fase 16). Alur top-up wali TERPISAH dari
 * `DepositService::topup()` (dipakai kasir/admin, instan, terikat
 * `payment_method_id`+sesi kasir) — di sini uang masuk rekening bank
 * (ADR-0010), jadi pengajuan berstatus `pending` dulu, saldo baru
 * ditambah saat admin/treasurer approve() lewat
 * `DepositService::record()` langsung (bukan wrapper `topup()`,
 * karena tidak ada payment_method_id/cashier_session_id di sini).
 */
class TopupRequestService
{
    public function __construct(private readonly DepositService $depositService) {}

    public function submit(Guardian $guardian, Member $member, int $amount, ?UploadedFile $proof, ?string $bankName, ?string $senderName, ?string $transferDate): TopupRequest
    {
        if ($amount <= 0) {
            throw new DomainException('Nominal top-up harus lebih dari nol.');
        }

        $path = $proof?->store('topup-proofs', 'public');

        return TopupRequest::create([
            'reference' => ReferenceGenerator::generate('TRQ', 0),
            'member_id' => $member->id,
            'guardian_id' => $guardian->id,
            'amount' => $amount,
            'proof_image' => $path,
            'bank_name' => $bankName,
            'sender_name' => $senderName,
            'transfer_date' => $transferDate,
            'status' => 'pending',
            'payment_provider' => 'manual',
        ]);
    }

    /**
     * Fase 17-Darurat (temuan audit): sebelumnya approve() murni
     * "percaya foto" — tidak ada langkah yang memaksa admin
     * mencocokkan dengan mutasi rekening koran sungguhan sebelum saldo
     * bertambah permanen. `$bankVerified` WAJIB true (dipaksa dari
     * controller via checkbox eksplisit di UI) — bukan penundaan
     * proses, cuma satu langkah sadar yang mencegah klik-cepat
     * berdasar foto semata. `$note` opsional (beda dari `reject()`
     * yang mewajibkan alasan) supaya kasus normal tetap cepat.
     */
    public function approve(TopupRequest $topupRequest, User $approver, bool $bankVerified, ?string $note = null): TopupRequest
    {
        if (! $bankVerified) {
            throw new DomainException('Verifikasi rekening koran wajib dicentang sebelum top-up disetujui.');
        }

        return DB::transaction(function () use ($topupRequest, $approver, $note) {
            $locked = TopupRequest::lockForUpdate()->findOrFail($topupRequest->id);

            if ($locked->status !== 'pending') {
                throw new DomainException('Pengajuan top-up sudah diproses sebelumnya.');
            }

            $this->depositService->record($locked->member, 'topup', abs($locked->amount), $locked, [
                'idempotency_key' => "topup-request-{$locked->id}",
                'approved_by' => $approver->id,
                'note' => $note ?: "Top-up wali {$locked->reference} diverifikasi",
            ]);

            $locked->update([
                'status' => 'approved',
                'verified_by' => $approver->id,
                'verified_at' => now(),
                'bank_verified_by' => $approver->id,
                'bank_verified_at' => now(),
            ]);

            return $locked->fresh();
        });
    }

    public function reject(TopupRequest $topupRequest, User $approver, string $reason): TopupRequest
    {
        return DB::transaction(function () use ($topupRequest, $approver, $reason) {
            $locked = TopupRequest::lockForUpdate()->findOrFail($topupRequest->id);

            if ($locked->status !== 'pending') {
                throw new DomainException('Pengajuan top-up sudah diproses sebelumnya.');
            }

            $locked->update([
                'status' => 'rejected',
                'verified_by' => $approver->id,
                'verified_at' => now(),
                'reject_reason' => $reason,
            ]);

            return $locked->fresh();
        });
    }
}
