<?php

namespace App\Services;

use App\Exceptions\PaymentMismatchException;
use App\Models\CashierSession;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\PayrollDeduction;
use App\Models\Receivable;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Services\PaymentHandlers\CardHandler;
use App\Services\PaymentHandlers\CashHandler;
use App\Services\PaymentHandlers\CreditHandler;
use App\Services\PaymentHandlers\DepositHandler;
use App\Services\PaymentHandlers\PaymentHandler;
use App\Services\PaymentHandlers\PayrollHandler;
use App\Services\PaymentHandlers\PointHandler;
use App\Services\PaymentHandlers\QrisHandler;
use App\Services\PaymentHandlers\VoucherHandler;
use DomainException;
use Illuminate\Container\Container;
use Illuminate\Support\Collection;

class PaymentService
{
    public function __construct(
        private readonly Container $container,
        private readonly DepositService $depositService,
        private readonly CashierSessionService $sessionService,
        private readonly CreditHandler $creditHandler,
    ) {}

    /**
     * @param  array<int, array<string, mixed>>  $payments  Satu baris per metode — lihat
     *                                                      PaymentHandler::handle() untuk bentuk tiap baris.
     * @return Collection<int, SalePayment>
     */
    public function process(Sale $sale, array $payments, ?Member $member, CashierSession $session, Outlet $outlet): Collection
    {
        $totalPaid = (int) array_sum(array_map(fn (array $p) => (int) $p['amount'], $payments));

        if ($totalPaid !== $sale->grand_total) {
            throw PaymentMismatchException::make($sale->grand_total, $totalPaid);
        }

        return collect($payments)->map(function (array $payload) use ($sale, $member, $session, $outlet) {
            $method = PaymentMethod::findOrFail($payload['payment_method_id']);
            $handler = $this->resolveHandler($method->type);

            return $handler->handle($sale, $method, $payload, $member, $session, $outlet);
        });
    }

    /**
     * @return array{allowed: bool, reason: ?string, limit: int, active: int}
     */
    public function canUseCredit(Member $member, int $amount): array
    {
        return $this->creditHandler->checkLimit($member, $amount);
    }

    /**
     * Pembalikan penuh satu baris SalePayment — dipakai oleh
     * SaleService::void(). Selalu mengembalikan ke metode ASAL
     * (ADR-0006 versi Fase 9): saldo -> saldo, non-tunai -> kurangi
     * catatan non-tunai sesi, kredit -> batalkan piutang, dst. Tidak
     * ada jalur yang mengizinkan konversi ke tunai.
     */
    public function refund(SalePayment $payment, CashierSession $session): void
    {
        $method = $payment->paymentMethod;
        $amount = $payment->amount;

        match ($method->type) {
            'cash' => $this->sessionService->addSaleCash($session, -$amount),
            'deposit' => $this->refundDeposit($payment, $amount, $session),
            'card', 'qris', 'ewallet', 'transfer' => $this->sessionService->addSaleNoncash($session, -$amount),
            'point' => $this->refundPoint($payment),
            'credit' => $this->refundCredit($payment, $amount),
            'payroll' => PayrollDeduction::where('sale_id', $payment->sale_id)->where('status', 'pending')->update(['status' => 'cancelled']),
            'voucher' => null, // sisa nilai voucher sudah hangus saat dipakai — tidak ada yang dikembalikan
            default => throw new DomainException("Refund untuk metode \"{$method->name}\" belum didukung."),
        };

        $payment->update(['status' => 'refunded']);
    }

    private function refundDeposit(SalePayment $payment, int $amount, CashierSession $session): void
    {
        $sale = $payment->sale;

        if ($sale->member_id === null) {
            return;
        }

        $member = Member::findOrFail($sale->member_id);
        $this->depositService->refund($member, $amount, $sale, "{$sale->idempotency_key}-void-{$payment->id}");
        $this->sessionService->addSaleDeposit($session, -$amount);
    }

    private function refundPoint(SalePayment $payment): void
    {
        if ($payment->point_used === null || $payment->sale->member_id === null) {
            return;
        }

        $member = Member::lockForUpdate()->findOrFail($payment->sale->member_id);
        $member->forceFill(['point_balance' => $member->point_balance + $payment->point_used])->save();
    }

    private function refundCredit(SalePayment $payment, int $amount): void
    {
        $receivable = Receivable::where('sale_id', $payment->sale_id)->first();

        if ($receivable === null) {
            return;
        }

        $newTotal = max(0, $receivable->total_amount - $amount);
        $newRemaining = max(0, $newTotal - $receivable->paid_amount);

        $receivable->update([
            'total_amount' => $newTotal,
            'remaining_amount' => $newRemaining,
            'status' => $newRemaining <= 0 ? 'paid' : $receivable->status,
        ]);
    }

    private function resolveHandler(string $type): PaymentHandler
    {
        return match ($type) {
            'cash' => $this->container->make(CashHandler::class),
            'deposit' => $this->container->make(DepositHandler::class),
            'card' => $this->container->make(CardHandler::class),
            'qris', 'ewallet', 'transfer' => $this->container->make(QrisHandler::class),
            'voucher' => $this->container->make(VoucherHandler::class),
            'point' => $this->container->make(PointHandler::class),
            'credit' => $this->creditHandler,
            'payroll' => $this->container->make(PayrollHandler::class),
            default => throw new DomainException("Tipe metode bayar \"{$type}\" tidak dikenali."),
        };
    }
}
