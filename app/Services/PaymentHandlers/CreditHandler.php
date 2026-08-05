<?php

namespace App\Services\PaymentHandlers;

use App\Exceptions\CreditLimitExceededException;
use App\Models\CashierSession;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Receivable;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Services\AuthorizationService;
use App\Support\ReferenceGenerator;
use DomainException;

/**
 * Metode Kredit/Tempo — ADR-0005 (receivable_limit, bukan
 * allow_negative/credit_limit). checkLimit() adalah sumber kebenaran
 * tunggal dipakai baik di sini maupun PaymentService::canUseCredit()
 * (dipanggil terpisah dari POS untuk preview sebelum kasir pilih
 * metode ini).
 */
class CreditHandler implements PaymentHandler
{
    public function __construct(private readonly AuthorizationService $authorizationService) {}

    public function handle(Sale $sale, PaymentMethod $method, array $payload, ?Member $member, CashierSession $session, Outlet $outlet): SalePayment
    {
        if ($member === null) {
            throw new DomainException('Metode Kredit/Tempo membutuhkan anggota yang terpilih.');
        }

        $amount = (int) $payload['amount'];
        $check = $this->checkLimit($member, $amount);

        if (! $check['allowed']) {
            // Audit Fase 6 (Temuan Sedang): sebelumnya `$payload['approver']`
            // dicek sebagai truthy MENTAH (tidak divalidasi FormRequest,
            // dan kalau ada nilainya tidak pernah dicek permission apa
            // pun) — celah bypass limit piutang total kalau field ini
            // pernah "diperbaiki" tanpa mengikuti pola token. Sekarang
            // token sekali-pakai, permission receivable.approve.
            $approver = $this->authorizationService->consumeToken($payload['credit_approval_token'] ?? null, 'receivable.approve');

            if ($approver === null) {
                throw CreditLimitExceededException::make($check['limit'], $check['active'], $amount);
            }
        }

        Receivable::create([
            // PYT (Piutang) untuk penerbitan, PTG (Pembayaran Piutang) untuk
            // cicilan — sama seperti DBT/HTG di Debt (Fase 6): dokumen resmi
            // hanya mendaftarkan prefiks pembayarannya (PTG), bukan
            // penerbitannya, jadi PYT diadaptasi dengan pola yang sama.
            'reference' => ReferenceGenerator::generate('PYT', $outlet->id),
            'member_id' => $member->id,
            'sale_id' => $sale->id,
            'outlet_id' => $outlet->id,
            'total_amount' => $amount,
            'paid_amount' => 0,
            'remaining_amount' => $amount,
            'due_date' => now()->addDays((int) config('pos.receivable_due_days', 30))->toDateString(),
            'status' => 'unpaid',
        ]);

        return SalePayment::create([
            'sale_id' => $sale->id,
            'payment_method_id' => $method->id,
            'amount' => $amount,
            'net_amount' => $amount,
            'status' => 'settled',
            'settled_at' => now(),
        ]);
    }

    /**
     * @return array{allowed: bool, reason: ?string, limit: int, active: int}
     */
    public function checkLimit(Member $member, int $amount): array
    {
        $activeReceivable = (int) Receivable::where('member_id', $member->id)
            ->whereIn('status', ['unpaid', 'partial', 'overdue'])
            ->sum('remaining_amount');

        $newTotal = $activeReceivable + $amount;

        if ($newTotal > $member->receivable_limit) {
            return [
                'allowed' => false,
                'reason' => 'over_limit',
                'limit' => $member->receivable_limit,
                'active' => $activeReceivable,
            ];
        }

        return ['allowed' => true, 'reason' => null, 'limit' => $member->receivable_limit, 'active' => $activeReceivable];
    }
}
