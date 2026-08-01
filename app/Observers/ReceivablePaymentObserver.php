<?php

namespace App\Observers;

use App\Models\ReceivablePayment;
use App\Services\JournalService;

/**
 * T-081. ReceivableService::pay() membuat ReceivablePayment::create()
 * sebagai satu baris utuh — created() biasa aman.
 */
class ReceivablePaymentObserver
{
    public function __construct(private readonly JournalService $journalService) {}

    public function created(ReceivablePayment $payment): void
    {
        if ($payment->amount <= 0) {
            return;
        }

        $payment->load('receivable.outlet');
        $debitCode = $payment->payment_method === 'transfer' ? '1-1201' : '1-1101';

        $entries = [
            ['account_code' => $debitCode, 'debit' => $payment->amount, 'credit' => 0, 'description' => "Bayar piutang {$payment->receivable->reference}"],
            ['account_code' => '1-1500', 'debit' => 0, 'credit' => $payment->amount, 'description' => 'Pelunasan piutang anggota'],
        ];

        $this->journalService->record('cash', $entries, $payment, $payment->payment_date, "Pelunasan piutang {$payment->reference}", $payment->receivable->outlet_id);
    }
}
