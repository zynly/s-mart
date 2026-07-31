<?php

namespace App\Services;

use App\Exceptions\DebtOverpaymentException;
use App\Models\Debt;
use App\Models\DebtPayment;
use App\Models\Purchase;
use App\Models\User;
use App\Support\ReferenceGenerator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DebtService
{
    public function createFromPurchase(Purchase $purchase): Debt
    {
        $dueDate = $purchase->due_date
            ?? $purchase->purchase_date->copy()->addDays($purchase->supplier->payment_term_days ?? 0);

        return Debt::create([
            'reference' => ReferenceGenerator::generate('DBT', $purchase->outlet_id),
            'supplier_id' => $purchase->supplier_id,
            'purchase_id' => $purchase->id,
            'outlet_id' => $purchase->outlet_id,
            'total_amount' => $purchase->total,
            'paid_amount' => 0,
            'remaining_amount' => $purchase->total,
            'due_date' => $dueDate,
            'status' => 'unpaid',
        ]);
    }

    public function pay(Debt $debt, int $amount, ?int $paymentMethodId, ?User $user = null, ?string $refNo = null, ?string $note = null): DebtPayment
    {
        return DB::transaction(function () use ($debt, $amount, $paymentMethodId, $user, $refNo, $note) {
            $locked = Debt::lockForUpdate()->findOrFail($debt->id);

            if ($amount > $locked->remaining_amount) {
                throw DebtOverpaymentException::make($locked->remaining_amount, $amount);
            }

            $payment = DebtPayment::create([
                'reference' => ReferenceGenerator::generate('HTG', $locked->outlet_id),
                'debt_id' => $locked->id,
                'payment_date' => now()->toDateString(),
                'amount' => $amount,
                'payment_method_id' => $paymentMethodId,
                'ref_no' => $refNo,
                'note' => $note,
                'created_by' => $user?->id ?? auth()->id(),
            ]);

            $newPaid = $locked->paid_amount + $amount;
            $newRemaining = $locked->total_amount - $newPaid;

            $locked->update([
                'paid_amount' => $newPaid,
                'remaining_amount' => $newRemaining,
                'status' => $this->resolveStatus($newRemaining, $newPaid, $locked->due_date),
            ]);

            return $payment;
        });
    }

    /**
     * Retur pembelian kredit mengurangi hutang langsung — bukan menambah
     * kas (CATATAN-PERBAIKAN.md § Fase 6).
     */
    public function reduceFromReturn(Debt $debt, int $amount): void
    {
        DB::transaction(function () use ($debt, $amount) {
            $locked = Debt::lockForUpdate()->findOrFail($debt->id);
            $newTotal = max(0, $locked->total_amount - $amount);
            $newRemaining = max(0, $newTotal - $locked->paid_amount);

            $locked->update([
                'total_amount' => $newTotal,
                'remaining_amount' => $newRemaining,
                'status' => $this->resolveStatus($newRemaining, $locked->paid_amount, $locked->due_date),
            ]);
        });
    }

    /**
     * @return Collection<int, array{debt: Debt, bucket: string}>
     */
    public function getAging(?int $supplierId = null): Collection
    {
        return Debt::query()
            ->whereIn('status', ['unpaid', 'partial', 'overdue'])
            ->when($supplierId, fn ($q, $id) => $q->where('supplier_id', $id))
            ->with('supplier:id,name')
            ->get()
            ->map(function (Debt $debt) {
                $daysOverdue = now()->diffInDays($debt->due_date, false) * -1;

                $bucket = match (true) {
                    $daysOverdue <= 0 => 'current',
                    $daysOverdue <= 30 => '0-30',
                    $daysOverdue <= 60 => '31-60',
                    $daysOverdue <= 90 => '61-90',
                    default => '90+',
                };

                return ['debt' => $debt, 'bucket' => $bucket];
            });
    }

    /**
     * @return Collection<int, Debt>
     */
    public function getDueSoon(int $days = 3): Collection
    {
        return Debt::query()
            ->whereIn('status', ['unpaid', 'partial'])
            ->whereBetween('due_date', [now()->toDateString(), now()->addDays($days)->toDateString()])
            ->with('supplier:id,name')
            ->get();
    }

    private function resolveStatus(int $remaining, int $paid, \DateTimeInterface $dueDate): string
    {
        if ($remaining <= 0) {
            return 'paid';
        }

        if (now()->toDateString() > $dueDate->format('Y-m-d')) {
            return 'overdue';
        }

        return $paid > 0 ? 'partial' : 'unpaid';
    }
}
