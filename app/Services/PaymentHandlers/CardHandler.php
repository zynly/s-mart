<?php

namespace App\Services\PaymentHandlers;

use App\Models\CashierSession;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Services\CashierSessionService;
use DomainException;

/**
 * Kartu debit/kredit EDC. Wajib nomor approval, MDR dipotong
 * (net_amount = amount - amount*mdr_percent). Settle langsung (bukti
 * approval EDC = konfirmasi real-time, beda dengan QRIS yang bisa
 * pending sampai H+1).
 */
class CardHandler implements PaymentHandler
{
    public function __construct(private readonly CashierSessionService $sessionService) {}

    public function handle(Sale $sale, PaymentMethod $method, array $payload, ?Member $member, CashierSession $session, Outlet $outlet): SalePayment
    {
        $referenceNo = trim((string) ($payload['reference_no'] ?? ''));

        if ($referenceNo === '') {
            throw new DomainException("Metode \"{$method->name}\" membutuhkan nomor approval.");
        }

        $amount = (int) $payload['amount'];
        $mdrPercent = (float) $method->mdr_percent;
        $mdrAmount = (int) round($amount * $mdrPercent / 100);
        $netAmount = $amount - $mdrAmount;

        $this->sessionService->addSaleNoncash($session, $amount);

        return SalePayment::create([
            'sale_id' => $sale->id,
            'payment_method_id' => $method->id,
            'amount' => $amount,
            'cash_account_id' => $method->cash_account_id,
            'reference_no' => $referenceNo,
            'mdr_percent' => $mdrPercent,
            'mdr_amount' => $mdrAmount,
            'net_amount' => $netAmount,
            'status' => 'settled',
            'settled_at' => now(),
        ]);
    }
}
