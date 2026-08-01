<?php

namespace App\Observers;

use App\Models\DebtPayment;
use App\Services\JournalService;

/**
 * T-081. DebtService::pay() membuat DebtPayment::create() sebagai satu
 * baris utuh (tidak ada anak tabel sesudahnya) — created() biasa aman,
 * tidak perlu ShouldHandleEventsAfterCommit.
 */
class DebtPaymentObserver
{
    public function __construct(private readonly JournalService $journalService) {}

    public function created(DebtPayment $payment): void
    {
        if ($payment->amount <= 0) {
            return;
        }

        $payment->load(['debt.outlet', 'paymentMethod']);
        $creditCode = $payment->paymentMethod !== null
            ? $this->journalService->resolvePaymentMethodAccountCode($payment->paymentMethod)
            : '1-1101';

        $entries = [
            ['account_code' => '2-1100', 'debit' => $payment->amount, 'credit' => 0, 'description' => 'Pelunasan utang usaha'],
            ['account_code' => $creditCode, 'debit' => 0, 'credit' => $payment->amount, 'description' => "Bayar utang {$payment->debt->reference}"],
        ];

        $this->journalService->record('cash', $entries, $payment, $payment->payment_date, "Pembayaran utang {$payment->reference}", $payment->debt->outlet_id);
    }
}
