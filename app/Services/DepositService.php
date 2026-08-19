<?php

namespace App\Services;

use App\Exceptions\InsufficientBalanceException;
use App\Exceptions\MissingIdempotencyKeyException;
use App\Models\DepositTransaction;
use App\Models\Member;
use App\Models\MemberCard;
use App\Models\User;
use App\Support\ReferenceGenerator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class DepositService
{
    /**
     * Satu-satunya jalur resmi untuk mengubah members.balance_cache.
     * Saldo tidak pernah boleh negatif — belanja di atas saldo memakai
     * metode bayar Kredit terpisah (PaymentService::canUseCredit(),
     * Fase 9), bukan lewat service ini (ADR-0005).
     *
     * @param  array{idempotency_key: string, member_card_id?: int, outlet_id?: int,
     *     payment_method_id?: int, cash_account_id?: int, cashier_session_id?: int,
     *     user_id?: int, approved_by?: int, note?: string}  $meta
     */
    public function record(Member $member, string $type, int $amount, ?Model $source = null, array $meta = []): DepositTransaction
    {
        $idempotencyKey = $meta['idempotency_key'] ?? null;

        if ($idempotencyKey === null) {
            throw MissingIdempotencyKeyException::make();
        }

        return DB::transaction(function () use ($member, $type, $amount, $source, $meta, $idempotencyKey) {
            $existing = DepositTransaction::where('idempotency_key', $idempotencyKey)->first();

            if ($existing !== null) {
                return $existing;
            }

            $locked = Member::lockForUpdate()->findOrFail($member->id);

            $before = $locked->balance_cache;
            $after = $before + $amount;

            if ($after < 0) {
                throw InsufficientBalanceException::make($before, abs($amount));
            }

            $trx = DepositTransaction::create([
                // Counter referensi deposit sengaja tidak di-scope per outlet_id
                // (selalu 0) — beda dari Sale/Purchase yang murni per-outlet.
                // Banyak tipe deposit (adjustment, bonus, card_transfer_*) tidak
                // punya outlet sama sekali; men-scope per outlet_id akan membuat
                // dua bucket counter berbeda start dari 1 di hari yang sama dan
                // bertabrakan pada string referensi global yang unique.
                'reference' => ReferenceGenerator::generate('DEP', 0),
                'member_id' => $locked->id,
                'member_card_id' => $meta['member_card_id'] ?? null,
                'outlet_id' => $meta['outlet_id'] ?? null,
                'type' => $type,
                'amount' => $amount,
                'balance_before' => $before,
                'balance_after' => $after,
                'sourceable_type' => $source?->getMorphClass(),
                'sourceable_id' => $source?->getKey(),
                'payment_method_id' => $meta['payment_method_id'] ?? null,
                'cash_account_id' => $meta['cash_account_id'] ?? null,
                'cashier_session_id' => $meta['cashier_session_id'] ?? null,
                'user_id' => $meta['user_id'] ?? auth()->id(),
                'approved_by' => $meta['approved_by'] ?? null,
                'idempotency_key' => $idempotencyKey,
                'note' => $meta['note'] ?? null,
            ]);

            // balance_cache sengaja tidak fillable di Member (dilindungi dari
            // mass-assignment biasa) — forceFill() adalah satu-satunya jalur
            // resmi yang boleh menulisnya, dan hanya dari sini.
            $locked->forceFill(['balance_cache' => $after])->save();

            return $trx;
        });
    }

    public function topup(Member $member, int $amount, int $paymentMethodId, string $idempotencyKey, ?int $outletId = null, ?int $cashierSessionId = null): DepositTransaction
    {
        return $this->record($member, 'topup', abs($amount), null, [
            'idempotency_key' => $idempotencyKey,
            'payment_method_id' => $paymentMethodId,
            'outlet_id' => $outletId,
            'cashier_session_id' => $cashierSessionId,
        ]);
    }

    public function charge(Member $member, int $amount, Model $sale, string $idempotencyKey, ?int $outletId = null, ?int $cashierSessionId = null): DepositTransaction
    {
        return $this->record($member, 'purchase', -abs($amount), $sale, [
            'idempotency_key' => $idempotencyKey,
            'outlet_id' => $outletId,
            'cashier_session_id' => $cashierSessionId,
        ]);
    }

    public function refund(Member $member, int $amount, Model $saleReturn, string $idempotencyKey): DepositTransaction
    {
        return $this->record($member, 'refund', abs($amount), $saleReturn, [
            'idempotency_key' => $idempotencyKey,
        ]);
    }

    public function withdraw(Member $member, int $amount, User $approver, string $idempotencyKey, ?string $note = null, ?int $outletId = null, ?int $cashierSessionId = null): DepositTransaction
    {
        return $this->record($member, 'withdrawal', -abs($amount), null, [
            'idempotency_key' => $idempotencyKey,
            'approved_by' => $approver->id,
            'note' => $note,
            'outlet_id' => $outletId,
            'cashier_session_id' => $cashierSessionId,
        ]);
    }

    public function adjust(Member $member, int $amount, string $reason, User $owner, string $idempotencyKey): DepositTransaction
    {
        return $this->record($member, 'adjustment', $amount, null, [
            'idempotency_key' => $idempotencyKey,
            'approved_by' => $owner->id,
            'user_id' => $owner->id,
            'note' => $reason,
        ]);
    }

    public function bonus(Member $member, int $amount, string $reason, string $idempotencyKey): DepositTransaction
    {
        return $this->record($member, 'bonus', abs($amount), null, [
            'idempotency_key' => $idempotencyKey,
            'note' => $reason,
        ]);
    }

    /**
     * Ganti kartu: dua baris ledger berpasangan, jumlah net nol.
     * Saldo sebenarnya melekat di Member, bukan di kartu, jadi ini
     * murni jejak audit per-kartu — balance_cache tidak berubah setelah
     * kedua baris tercatat. idempotency_key input dipecah jadi dua
     * varian (-out/-in) karena kolom idempotency_key bersifat unique.
     */
    public function transferCard(Member $member, MemberCard $from, MemberCard $to, string $idempotencyKey): void
    {
        DB::transaction(function () use ($member, $from, $to, $idempotencyKey) {
            $locked = Member::lockForUpdate()->findOrFail($member->id);
            $amount = $locked->balance_cache;

            if ($amount === 0) {
                return;
            }

            $this->record($locked, 'card_transfer_out', -$amount, null, [
                'idempotency_key' => "{$idempotencyKey}-out",
                'member_card_id' => $from->id,
            ]);

            $this->record($locked->fresh(), 'card_transfer_in', $amount, null, [
                'idempotency_key' => "{$idempotencyKey}-in",
                'member_card_id' => $to->id,
            ]);
        });
    }

    public function closeAccount(Member $member, string $method, string $idempotencyKey): DepositTransaction
    {
        return $this->record($member, 'closing', -$member->balance_cache, null, [
            'idempotency_key' => $idempotencyKey,
            'note' => "Tutup akun via {$method}",
        ]);
    }
}
