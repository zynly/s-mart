<?php

namespace App\Services;

use App\Exceptions\InsufficientCashBalanceException;
use App\Models\CashAccount;
use App\Models\CashierSession;
use App\Models\CashTransaction;
use App\Support\ReferenceGenerator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class CashService
{
    public function recordIn(
        CashAccount $account,
        int $amount,
        ?int $categoryId,
        string $description,
        ?CashierSession $session = null,
        ?Model $source = null,
        ?int $userId = null,
    ): CashTransaction {
        return DB::transaction(function () use ($account, $amount, $categoryId, $description, $session, $source, $userId) {
            $locked = CashAccount::lockForUpdate()->findOrFail($account->id);
            $before = $locked->current_balance;
            $after = $before + $amount;

            $isDrawerSession = ($session !== null && $session->cash_account_id === $locked->id && $locked->is_drawer);
            $validSession = $isDrawerSession ? $session : null;

            $trx = CashTransaction::create([
                'reference' => ReferenceGenerator::generate('KAS', $locked->outlet_id),
                'cash_account_id' => $locked->id,
                'cash_category_id' => $categoryId,
                'outlet_id' => $locked->outlet_id,
                'cashier_session_id' => $validSession?->id,
                'type' => 'in',
                'amount' => $amount,
                'balance_before' => $before,
                'balance_after' => $after,
                'transaction_date' => now()->toDateString(),
                'description' => $description,
                'sourceable_type' => $source?->getMorphClass(),
                'sourceable_id' => $source?->getKey(),
                'user_id' => $userId ?? auth()->id(),
            ]);

            $locked->forceFill(['current_balance' => $after])->save();

            if ($validSession !== null) {
                $validSession->increment('total_cash_in', $amount);
            }

            return $trx;
        });
    }

    public function recordOut(
        CashAccount $account,
        int $amount,
        ?int $categoryId,
        string $description,
        ?CashierSession $session = null,
        ?Model $source = null,
        ?int $userId = null,
        ?int $approvedBy = null,
    ): CashTransaction {
        return DB::transaction(function () use ($account, $amount, $categoryId, $description, $session, $source, $userId, $approvedBy) {
            $locked = CashAccount::lockForUpdate()->findOrFail($account->id);

            $isDrawerSession = ($session !== null && $session->cash_account_id === $locked->id && $locked->is_drawer);
            $validSession = $isDrawerSession ? $session : null;

            $availableCash = $isDrawerSession
                ? app(CashierSessionService::class)->calculateExpected($validSession)
                : $locked->current_balance;

            if ($availableCash < $amount) {
                throw InsufficientCashBalanceException::make($availableCash, $amount);
            }

            $before = $locked->current_balance;
            $after = max(0, $before - $amount);

            $trx = CashTransaction::create([
                'reference' => ReferenceGenerator::generate('KAS', $locked->outlet_id),
                'cash_account_id' => $locked->id,
                'cash_category_id' => $categoryId,
                'outlet_id' => $locked->outlet_id,
                'cashier_session_id' => $validSession?->id,
                'type' => 'out',
                'amount' => $amount,
                'balance_before' => $before,
                'balance_after' => $after,
                'transaction_date' => now()->toDateString(),
                'description' => $description,
                'sourceable_type' => $source?->getMorphClass(),
                'sourceable_id' => $source?->getKey(),
                'user_id' => $userId ?? auth()->id(),
                'approved_by' => $approvedBy,
            ]);

            $locked->forceFill(['current_balance' => $after])->save();

            if ($validSession !== null) {
                $validSession->increment('total_cash_out', $amount);
            }

            return $trx;
        });
    }

    /**
     * Drop cash & setoran bank adalah transfer antar akun, bukan
     * pengeluaran — tidak menyentuh cash_category.
     */
    public function transfer(
        CashAccount $from,
        CashAccount $to,
        int $amount,
        string $description,
        ?CashierSession $session = null,
        ?int $userId = null,
    ): CashTransaction {
        return DB::transaction(function () use ($from, $to, $amount, $description, $session, $userId) {
            $fromLocked = CashAccount::lockForUpdate()->findOrFail($from->id);
            $availableCash = ($session !== null && $session->cash_account_id === $fromLocked->id)
                ? app(CashierSessionService::class)->calculateExpected($session)
                : $fromLocked->current_balance;

            if ($availableCash < $amount) {
                throw InsufficientCashBalanceException::make($availableCash, $amount);
            }

            $toLocked = CashAccount::lockForUpdate()->findOrFail($to->id);

            $fromAfter = max(0, $fromLocked->current_balance - $amount);
            $toAfter = $toLocked->current_balance + $amount;

            $trx = CashTransaction::create([
                'reference' => ReferenceGenerator::generate('KAS', $fromLocked->outlet_id),
                'cash_account_id' => $fromLocked->id,
                'outlet_id' => $fromLocked->outlet_id,
                'cashier_session_id' => $session?->id,
                'type' => 'transfer',
                'transfer_to_account_id' => $toLocked->id,
                'amount' => $amount,
                'balance_before' => $fromLocked->current_balance,
                'balance_after' => $fromAfter,
                'transaction_date' => now()->toDateString(),
                'description' => $description,
                'user_id' => $userId ?? auth()->id(),
            ]);

            $fromLocked->forceFill(['current_balance' => $fromAfter])->save();
            $toLocked->forceFill(['current_balance' => $toAfter])->save();

            return $trx;
        });
    }

    public function dropCash(CashierSession $session, CashAccount $vault, int $amount, ?int $userId = null): CashTransaction
    {
        $drawer = CashAccount::findOrFail($session->cash_account_id);
        $trx = $this->transfer($drawer, $vault, $amount, "Drop cash dari sesi {$session->reference}", $session, $userId);
        $session->increment('total_drop', $amount);

        return $trx;
    }

    public function depositToBank(CashAccount $vault, CashAccount $bank, int $amount, ?int $userId = null): CashTransaction
    {
        return $this->transfer($vault, $bank, $amount, 'Setoran ke bank', null, $userId);
    }
}
