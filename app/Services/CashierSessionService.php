<?php

namespace App\Services;

use App\Exceptions\CashDifferenceRequiresApprovalException;
use App\Exceptions\SessionAlreadyOpenException;
use App\Exceptions\SessionCannotCloseWithHoldsException;
use App\Models\CashAccount;
use App\Models\CashierSession;
use App\Models\User;
use App\Support\ReferenceGenerator;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CashierSessionService
{
    public function open(User $user, CashAccount $cashAccount, int $openingCash): CashierSession
    {
        return DB::transaction(function () use ($user, $cashAccount, $openingCash) {
            $existing = CashierSession::where('user_id', $user->id)->where('status', 'open')->lockForUpdate()->first();

            if ($existing !== null) {
                throw SessionAlreadyOpenException::make();
            }

            $account = CashAccount::lockForUpdate()->findOrFail($cashAccount->id);

            return CashierSession::create([
                'reference' => ReferenceGenerator::generate('SES', $account->outlet_id),
                'outlet_id' => $account->outlet_id,
                'user_id' => $user->id,
                'cash_account_id' => $account->id,
                'opened_at' => now(),
                'opening_cash' => $openingCash,
                'expected_cash' => $openingCash,
                'status' => 'open',
            ]);
        });
    }

    public function getActive(User $user): ?CashierSession
    {
        return CashierSession::where('user_id', $user->id)->where('status', 'open')->first();
    }

    public function calculateExpected(CashierSession $session): int
    {
        return $session->opening_cash
            + $session->total_sales_cash
            + $session->total_topup_cash
            + $session->total_receivable_cash
            + $session->total_cash_in
            - $session->total_cash_out
            - $session->total_drop
            - $session->total_refund_cash;
    }

    /**
     * Selisih (actual - expected) melebihi toleransi (config pos.
     * opname_tolerance_percent, dari nilai expected) wajib $reason +
     * $approver (PIN supervisor, dicek di controller lewat
     * AuthorizationService sebelum sampai sini).
     */
    public function close(CashierSession $session, int $actualCash, ?string $reason = null, ?User $approver = null): CashierSession
    {
        return DB::transaction(function () use ($session, $actualCash, $reason, $approver) {
            $locked = CashierSession::lockForUpdate()->findOrFail($session->id);

            if ($locked->status !== 'open') {
                throw new DomainException('Sesi sudah ditutup — tidak bisa ditutup ulang atau dibuka kembali.');
            }

            $this->ensureNoActiveHolds($locked);

            $expected = $this->calculateExpected($locked);
            $difference = $actualCash - $expected;
            $toleranceAmount = (int) round(abs($expected) * ((float) config('pos.opname_tolerance_percent', 0.5)) / 100);

            if (abs($difference) > $toleranceAmount && ($reason === null || $approver === null)) {
                throw CashDifferenceRequiresApprovalException::make($difference);
            }

            $locked->update([
                'closed_at' => now(),
                'expected_cash' => $expected,
                'actual_cash' => $actualCash,
                'difference' => $difference,
                'status' => 'closed',
                'difference_reason' => $reason,
                'approved_by' => $approver?->id,
                'approved_at' => $approver !== null ? now() : null,
            ]);

            return $locked;
        });
    }

    /**
     * Dipakai command session:auto-close (T-047) — sesi lupa ditutup,
     * actual_cash disamakan dengan expected_cash, tanpa selisih.
     */
    public function forceClose(CashierSession $session): CashierSession
    {
        return DB::transaction(function () use ($session) {
            $locked = CashierSession::lockForUpdate()->findOrFail($session->id);

            if ($locked->status !== 'open') {
                return $locked;
            }

            $expected = $this->calculateExpected($locked);

            $locked->update([
                'closed_at' => now(),
                'expected_cash' => $expected,
                'actual_cash' => $expected,
                'difference' => 0,
                'status' => 'force_closed',
                'note' => trim(($locked->note ? $locked->note.' ' : '').'Ditutup otomatis oleh sistem (session:auto-close).'),
            ]);

            return $locked;
        });
    }

    /**
     * Serah terima shift dalam laci yang sama: tutup sesi lama tanpa
     * selisih (actual = expected), buka sesi baru untuk user berikutnya
     * dengan modal awal = sisa kas sesi lama.
     */
    public function handover(CashierSession $from, User $to): CashierSession
    {
        return DB::transaction(function () use ($from, $to) {
            $expected = $this->calculateExpected($from);
            $this->close($from, $expected);

            return $this->open($to, CashAccount::findOrFail($from->cash_account_id), $expected);
        });
    }

    public function addSaleCash(CashierSession $session, int $amount): void
    {
        $session->increment('total_sales_cash', $amount);
        $session->increment('transaction_count');
    }

    public function addSaleDeposit(CashierSession $session, int $amount): void
    {
        $session->increment('total_sales_deposit', $amount);
        $session->increment('transaction_count');
    }

    public function addSaleNoncash(CashierSession $session, int $amount): void
    {
        $session->increment('total_sales_noncash', $amount);
        $session->increment('transaction_count');
    }

    public function addTopupCash(CashierSession $session, int $amount): void
    {
        $session->increment('total_topup_cash', $amount);
    }

    public function addReceivablePayment(CashierSession $session, int $amount, bool $isCash): void
    {
        $session->increment($isCash ? 'total_receivable_cash' : 'total_receivable_noncash', $amount);
    }

    public function addRefundCash(CashierSession $session, int $amount): void
    {
        $session->increment('total_refund_cash', $amount);
    }

    public function addVoid(CashierSession $session): void
    {
        $session->increment('void_count');
    }

    /**
     * sale_holds baru dibuat di Fase 8 (T-048) — cek ini diaktifkan
     * penuh di T-052. Sebelum tabelnya ada, tidak ada apa pun untuk
     * diperiksa (skip aman, bukan lolos diam-diam).
     */
    private function ensureNoActiveHolds(CashierSession $session): void
    {
        if (! Schema::hasTable('sale_holds')) {
            return;
        }

        $holdCount = DB::table('sale_holds')->where('cashier_session_id', $session->id)->count();

        if ($holdCount > 0) {
            throw SessionCannotCloseWithHoldsException::make($holdCount);
        }
    }
}
