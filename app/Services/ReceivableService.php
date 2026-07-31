<?php

namespace App\Services;

use App\Exceptions\ReceivableOverpaymentException;
use App\Models\CashierSession;
use App\Models\Receivable;
use App\Models\ReceivablePayment;
use App\Models\User;
use App\Support\ReferenceGenerator;
use DomainException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ReceivableService
{
    public function __construct(private readonly CashierSessionService $sessionService) {}

    public function pay(
        Receivable $receivable,
        int $amount,
        string $paymentMethod,
        ?int $cashAccountId = null,
        ?CashierSession $session = null,
        ?User $user = null,
        ?string $note = null,
    ): ReceivablePayment {
        return DB::transaction(function () use ($receivable, $amount, $paymentMethod, $cashAccountId, $session, $user, $note) {
            $locked = Receivable::lockForUpdate()->findOrFail($receivable->id);

            if ($amount > $locked->remaining_amount) {
                throw ReceivableOverpaymentException::make($locked->remaining_amount, $amount);
            }

            $payment = ReceivablePayment::create([
                'reference' => ReferenceGenerator::generate('PTG', $locked->outlet_id),
                'receivable_id' => $locked->id,
                'cash_account_id' => $cashAccountId,
                'payment_date' => now()->toDateString(),
                'amount' => $amount,
                'payment_method' => $paymentMethod,
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

            if ($session !== null) {
                $this->sessionService->addReceivablePayment($session, $amount, $paymentMethod === 'cash');
            }

            return $payment;
        });
    }

    /**
     * Eksklusif owner (receivable.delete — ADR-0005), piutang > 90 hari
     * jatuh tempo. Tidak menghapus baris — soft delete + status
     * written_off supaya jejak tetap ada di laporan.
     */
    public function writeOff(Receivable $receivable, User $owner): Receivable
    {
        return DB::transaction(function () use ($receivable, $owner) {
            $locked = Receivable::lockForUpdate()->findOrFail($receivable->id);

            $daysOverdue = now()->diffInDays($locked->due_date, false) * -1;

            if ($daysOverdue <= 90) {
                throw new DomainException('Piutang hanya bisa dihapus bila sudah lewat jatuh tempo lebih dari 90 hari.');
            }

            $locked->update([
                'status' => 'written_off',
                'written_off_by' => $owner->id,
                'written_off_at' => now(),
            ]);

            $locked->delete();

            return $locked;
        });
    }

    /**
     * @return Collection<int, array{receivable: Receivable, bucket: string}>
     */
    public function getAging(?int $memberId = null): Collection
    {
        return Receivable::query()
            ->whereIn('status', ['unpaid', 'partial', 'overdue'])
            ->when($memberId, fn ($q, $id) => $q->where('member_id', $id))
            ->with('member:id,name,member_number')
            ->get()
            ->map(function (Receivable $receivable) {
                $daysOverdue = now()->diffInDays($receivable->due_date, false) * -1;

                $bucket = match (true) {
                    $daysOverdue <= 0 => 'current',
                    $daysOverdue <= 30 => '0-30',
                    $daysOverdue <= 60 => '31-60',
                    $daysOverdue <= 90 => '61-90',
                    default => '90+',
                };

                return ['receivable' => $receivable, 'bucket' => $bucket];
            });
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
