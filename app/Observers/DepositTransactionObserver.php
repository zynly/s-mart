<?php

namespace App\Observers;

use App\Models\CashAccount;
use App\Models\DepositTransaction;
use App\Services\JournalService;

/**
 * T-081 (Fase 13 §Temuan L). DepositService::record() membuat
 * DepositTransaction::create() sebagai satu baris utuh — created() biasa
 * aman. type tertentu di-skip atau ditangani terpisah sesuai peta:
 *   - purchase/refund: SUDAH tercakup jurnal Sale/SaleReturn (baris
 *     pembayaran deposit di sana), menjurnal lagi di sini dobel-hitung.
 *   - card_transfer_out/in: net nol per member (ganti kartu, bukan
 *     transaksi ekonomi riil), SKIP.
 *   - expired: belum ada code path di DepositService, tidak mungkin
 *     type ini muncul saat ini — tetap didaftar di match agar eksplisit.
 */
class DepositTransactionObserver
{
    public function __construct(private readonly JournalService $journalService) {}

    public function created(DepositTransaction $trx): void
    {
        if (in_array($trx->type, ['purchase', 'refund', 'card_transfer_out', 'card_transfer_in', 'expired'], true)) {
            return;
        }

        $entries = match ($trx->type) {
            'topup' => $this->topupEntries($trx),
            'withdrawal', 'closing' => $this->withdrawalEntries($trx),
            'bonus' => $this->bonusEntries($trx),
            'adjustment' => $this->adjustmentEntries($trx),
            default => null,
        };

        if ($entries === null) {
            return;
        }

        $this->journalService->record('cash', $entries, $trx, now(), "Deposit {$trx->type} {$trx->reference}", $trx->outlet_id);
    }

    private function topupEntries(DepositTransaction $trx): ?array
    {
        if ($trx->amount <= 0) {
            return null;
        }

        $debitCode = $trx->paymentMethod !== null
            ? $this->journalService->resolvePaymentMethodAccountCode($trx->paymentMethod)
            : '1-1101';

        return [
            ['account_code' => $debitCode, 'debit' => $trx->amount, 'credit' => 0, 'description' => 'Top-up deposit anggota'],
            ['account_code' => '2-1200', 'debit' => 0, 'credit' => $trx->amount, 'description' => "Utang deposit {$trx->reference}"],
        ];
    }

    private function withdrawalEntries(DepositTransaction $trx): ?array
    {
        $amount = abs($trx->amount);

        if ($amount <= 0) {
            return null;
        }

        return [
            ['account_code' => '2-1200', 'debit' => $amount, 'credit' => 0, 'description' => "Tarik saldo deposit {$trx->reference}"],
            ['account_code' => $this->cashAccountCode($trx), 'debit' => 0, 'credit' => $amount, 'description' => 'Kas keluar tarik saldo'],
        ];
    }

    private function bonusEntries(DepositTransaction $trx): ?array
    {
        if ($trx->amount <= 0) {
            return null;
        }

        return [
            ['account_code' => '6-1400', 'debit' => $trx->amount, 'credit' => 0, 'description' => "Bonus deposit {$trx->reference}"],
            ['account_code' => '2-1200', 'debit' => 0, 'credit' => $trx->amount, 'description' => 'Utang deposit dari bonus'],
        ];
    }

    private function adjustmentEntries(DepositTransaction $trx): ?array
    {
        if ($trx->amount === 0) {
            return null;
        }

        if ($trx->amount > 0) {
            return [
                ['account_code' => '6-1600', 'debit' => $trx->amount, 'credit' => 0, 'description' => "Penyesuaian saldo naik {$trx->reference}"],
                ['account_code' => '2-1200', 'debit' => 0, 'credit' => $trx->amount, 'description' => 'Utang deposit dari penyesuaian'],
            ];
        }

        $amount = abs($trx->amount);

        return [
            ['account_code' => '2-1200', 'debit' => $amount, 'credit' => 0, 'description' => "Penyesuaian saldo turun {$trx->reference}"],
            ['account_code' => '4-2300', 'debit' => 0, 'credit' => $amount, 'description' => 'Pendapatan lain-lain dari penyesuaian'],
        ];
    }

    private function cashAccountCode(DepositTransaction $trx): string
    {
        if ($trx->cash_account_id !== null) {
            return $this->journalService->resolveCashAccountCode($trx->cashAccount ?? CashAccount::findOrFail($trx->cash_account_id));
        }

        $default = $trx->outlet_id !== null
            ? CashAccount::where('outlet_id', $trx->outlet_id)->where('is_default', true)->first()
                ?? CashAccount::where('outlet_id', $trx->outlet_id)->first()
            : null;

        return $default !== null ? $this->journalService->resolveCashAccountCode($default) : '1-1101';
    }
}
