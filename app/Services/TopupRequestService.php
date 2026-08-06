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

        $this->assertNoDuplicatePending($guardian, $member, $amount);

        // Temuan audit keamanan: sebelumnya disimpan di disk `public`
        // (storage/app/public — bisa diakses lewat URL /storage/... tanpa
        // login sama sekali). Isinya foto struk transfer bank (no.
        // rekening, nama pengirim, nominal — data finansial wali santri).
        // Bertolak belakang dengan enkripsi UU PDP di Fase 17-Darurat.
        // Disk `local` (private) + akses lewat route ber-auth
        // (TopupRequestController::proof(), can:topup.view).
        $path = $proof?->store('topup-proofs', 'local');

        // REVISI-R1-v2.md §6.3 Jalur B — "simpan hash gambar bukti →
        // tolak bila bukti identik pernah dipakai". Hash isi FILE (bukan
        // nama file) supaya foto yang persis sama tidak bisa dipakai
        // ulang untuk pengajuan lain SETELAH sekali disetujui — dicek
        // terhadap pengajuan yang SUDAH approved saja (bukan semua
        // status) supaya wali yang diminta unggah ulang bukti yang sama
        // setelah ditolak tidak ikut terblokir.
        $hash = $proof !== null ? hash_file('sha256', $proof->getRealPath()) : null;

        if ($hash !== null) {
            $reused = TopupRequest::where('proof_hash', $hash)->where('status', 'approved')->exists();

            if ($reused) {
                throw new DomainException('Foto bukti transfer ini sudah pernah dipakai pada pengajuan top-up lain yang telah disetujui — unggah bukti transfer yang baru.');
            }
        }

        return TopupRequest::create([
            'reference' => ReferenceGenerator::generate('TRQ', 0),
            'member_id' => $member->id,
            'guardian_id' => $guardian->id,
            'amount' => $amount,
            'proof_image' => $path,
            'proof_hash' => $hash,
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

    /**
     * Integrasi Midtrans — alur "Bayar Otomatis". Beda dari submit()
     * manual: tidak ada bukti transfer/hash (tidak relevan, Midtrans
     * sendiri yang memverifikasi pembayaran), baris dibuat dulu
     * berstatus pending SEBELUM Snap token diminta (order_id yang
     * dikirim ke Midtrans = $topupRequest->reference).
     */
    public function createForGateway(Guardian $guardian, Member $member, int $amount): TopupRequest
    {
        if ($amount <= 0) {
            throw new DomainException('Nominal top-up harus lebih dari nol.');
        }

        $this->assertNoDuplicatePending($guardian, $member, $amount);

        return TopupRequest::create([
            'reference' => ReferenceGenerator::generate('TRQ', 0),
            'member_id' => $member->id,
            'guardian_id' => $guardian->id,
            'amount' => $amount,
            'status' => 'pending',
            'payment_provider' => 'midtrans',
        ]);
    }

    /**
     * Dipanggil dari MidtransWebhookController saat transaction_status
     * settlement/capture. Beda dari approve(): tidak ada $approver/
     * $bankVerified manusia — SISTEM yang memverifikasi (Midtrans
     * sendiri sudah menangani otorisasi pembayaran), makanya
     * verified_by/bank_verified_by dibiarkan null (bukan aksi admin).
     * idempotency_key DepositService::record() melindungi dari webhook
     * duplikat (Midtrans bisa retry notifikasi).
     */
    public function approveViaGateway(TopupRequest $topupRequest, string $gatewayTransactionId): TopupRequest
    {
        return DB::transaction(function () use ($topupRequest, $gatewayTransactionId) {
            $locked = TopupRequest::lockForUpdate()->findOrFail($topupRequest->id);

            if ($locked->status === 'approved') {
                return $locked->fresh();
            }

            if ($locked->status !== 'pending') {
                throw new DomainException('Pengajuan top-up sudah diproses sebelumnya.');
            }

            $this->depositService->record($locked->member, 'topup', abs($locked->amount), $locked, [
                'idempotency_key' => "midtrans-{$locked->id}",
                'note' => "Top-up wali {$locked->reference} diverifikasi otomatis via Midtrans",
            ]);

            $locked->update([
                'status' => 'approved',
                'verified_at' => now(),
                'payment_reference' => $gatewayTransactionId,
            ]);

            return $locked->fresh();
        });
    }

    /**
     * Untuk transaction_status deny/cancel/expire/failure dari webhook
     * Midtrans — saldo TIDAK disentuh, cuma menandai baris supaya wali
     * tahu pengajuan itu tidak berhasil (bukan menggantung selamanya
     * di status pending).
     */
    public function markGatewayFailed(TopupRequest $topupRequest, string $gatewayStatus): void
    {
        DB::transaction(function () use ($topupRequest, $gatewayStatus) {
            $locked = TopupRequest::lockForUpdate()->findOrFail($topupRequest->id);

            if ($locked->status !== 'pending') {
                return;
            }

            $locked->update([
                'status' => $gatewayStatus === 'expire' ? 'expired' : 'rejected',
                'reject_reason' => "Midtrans: {$gatewayStatus}",
            ]);
        });
    }

    /**
     * Temuan audit keamanan: route ini pakai middleware `idempotent`
     * (cuma cek header ADA, tidak dedup) dan tabel `topup_requests`
     * tidak punya kolom idempotency_key — klik dobel/retry jaringan
     * bisa bikin 2 pengajuan identik. Guard sederhana: tolak kalau
     * ada pengajuan pending identik (wali+anak+nominal) dalam 60
     * detik terakhir, tanpa perlu migrasi kolom baru. Dipakai
     * submit() (manual) DAN createForGateway() (Midtrans).
     */
    private function assertNoDuplicatePending(Guardian $guardian, Member $member, int $amount): void
    {
        $isDuplicate = TopupRequest::where('guardian_id', $guardian->id)
            ->where('member_id', $member->id)
            ->where('amount', $amount)
            ->where('status', 'pending')
            ->where('created_at', '>=', now()->subSeconds(60))
            ->exists();

        if ($isDuplicate) {
            throw new DomainException('Pengajuan top-up dengan nominal yang sama baru saja dikirim — mohon tunggu sebentar sebelum mengirim ulang.');
        }
    }
}
