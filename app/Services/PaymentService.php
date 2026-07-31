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
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class PaymentService
{
    public function __construct(
        private readonly Container $container,
        private readonly DepositService $depositService,
        private readonly CashierSessionService $sessionService,
        private readonly CreditHandler $creditHandler,
        private readonly PointService $pointService,
        private readonly ReceivableService $receivableService,
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

    /**
     * Pembalikan SEBAGIAN (atau bisa juga penuh) satu baris SalePayment
     * — dipakai SaleReturnService untuk retur (T-069), berbeda dari
     * refund() yang selalu membalik $payment->amount PENUH untuk void.
     *
     * $target datang dari SaleReturnService::calculateRefundOptions():
     * 'same' = ikuti metode asal $payment apa adanya; 'deposit'/'transfer'
     * = pengalihan ADR-0007 (asalnya tunai, sesi asal sudah tutup);
     * 'forfeited' = tidak ada uang kembali (voucher).
     *
     * $session di sini SENGAJA sesi yang SEDANG AKTIF memproses retur —
     * BUKAN sesi asal nota (yang bisa saja sudah tutup, ADR-0007). Untuk
     * refund tunai ini memakai kolom total_refund_cash yang memang
     * dirancang untuk ini (CashierSessionService::addRefundCash(),
     * dikurangkan di calculateExpected() sesi AKTIF, bukan sesi asal).
     * Untuk deposit/non-tunai/poin/kredit, TIDAK ada counter sesi kasir
     * yang disentuh sama sekali (beda dari refund() versi void) — uang/
     * nilainya sudah benar tercatat di ledger masing-masing (deposit_
     * transactions, point_transactions, receivables) yang tidak terikat
     * sesi kasir; menyentuh total_sales_deposit/noncash milik sesi AKTIF
     * akan salah karena sesi itu tidak pernah mencatat penjualan aslinya.
     *
     * @return array{status: string, deposit_transaction_id: ?int, point_refunded: ?int}
     */
    public function refundPartial(
        SalePayment $payment,
        int $amount,
        string $target,
        CashierSession $session,
        Model $source,
        string $idempotencyKey,
    ): array {
        $method = $payment->paymentMethod;

        if ($target === 'forfeited') {
            return ['status' => 'forfeited', 'deposit_transaction_id' => null, 'point_refunded' => null];
        }

        if ($target === 'deposit' && $method->type !== 'deposit') {
            // Pengalihan ADR-0007: asalnya tunai, sesi asal sudah tutup.
            return $this->refundPartialToDeposit($payment, $amount, $source, $idempotencyKey);
        }

        if ($target === 'transfer' && ! in_array($method->type, ['transfer', 'card', 'qris', 'ewallet'], true)) {
            // Pengalihan ADR-0007: asalnya tunai, sesi asal sudah tutup,
            // tidak ada anggota untuk dialihkan ke deposit — status
            // pending sampai dikonfirmasi manual (sama seperti transfer asli).
            return ['status' => 'pending', 'deposit_transaction_id' => null, 'point_refunded' => null];
        }

        return match ($method->type) {
            'cash' => $this->refundPartialCash($session, $amount),
            'deposit' => $this->refundPartialToDeposit($payment, $amount, $source, $idempotencyKey),
            'card', 'qris', 'ewallet', 'transfer' => ['status' => 'pending', 'deposit_transaction_id' => null, 'point_refunded' => null],
            'point' => $this->refundPartialPoint($payment, $amount),
            'credit' => $this->refundPartialCredit($payment, $amount),
            'payroll' => $this->refundPartialPayroll($payment, $amount),
            'voucher' => ['status' => 'forfeited', 'deposit_transaction_id' => null, 'point_refunded' => null],
            default => throw new DomainException("Refund untuk metode \"{$method->name}\" belum didukung."),
        };
    }

    /**
     * @return array{status: string, deposit_transaction_id: ?int, point_refunded: ?int}
     */
    private function refundPartialCash(CashierSession $session, int $amount): array
    {
        $this->sessionService->addRefundCash($session, $amount);

        return ['status' => 'settled', 'deposit_transaction_id' => null, 'point_refunded' => null];
    }

    /**
     * @return array{status: string, deposit_transaction_id: ?int, point_refunded: ?int}
     */
    private function refundPartialToDeposit(SalePayment $payment, int $amount, Model $source, string $idempotencyKey): array
    {
        $sale = $payment->sale;

        if ($sale->member_id === null) {
            throw new DomainException('Refund ke saldo deposit membutuhkan anggota pada nota ini.');
        }

        $member = Member::findOrFail($sale->member_id);
        $txn = $this->depositService->refund($member, $amount, $source, $idempotencyKey);

        return ['status' => 'settled', 'deposit_transaction_id' => $txn->id, 'point_refunded' => null];
    }

    /**
     * @return array{status: string, deposit_transaction_id: ?int, point_refunded: ?int}
     */
    private function refundPartialPoint(SalePayment $payment, int $amount): array
    {
        if ($payment->point_used === null || $payment->point_used <= 0 || $payment->sale->member_id === null) {
            return ['status' => 'settled', 'deposit_transaction_id' => null, 'point_refunded' => null];
        }

        $pointShare = (int) round($payment->point_used * $amount / $payment->amount);
        $member = Member::findOrFail($payment->sale->member_id);
        $this->pointService->refund($member, $pointShare, $payment->sale);

        return ['status' => 'settled', 'deposit_transaction_id' => null, 'point_refunded' => $pointShare];
    }

    /**
     * @return array{status: string, deposit_transaction_id: ?int, point_refunded: ?int}
     */
    private function refundPartialCredit(SalePayment $payment, int $amount): array
    {
        $receivable = Receivable::where('sale_id', $payment->sale_id)->first();

        if ($receivable !== null) {
            $this->receivableService->reduceFromReturn($receivable, $amount);
        }

        return ['status' => 'settled', 'deposit_transaction_id' => null, 'point_refunded' => null];
    }

    /**
     * @return array{status: string, deposit_transaction_id: ?int, point_refunded: ?int}
     */
    private function refundPartialPayroll(SalePayment $payment, int $amount): array
    {
        $deduction = PayrollDeduction::where('sale_id', $payment->sale_id)->where('status', 'pending')->first();

        if ($deduction !== null) {
            $newAmount = max(0, $deduction->amount - $amount);
            $deduction->update([
                'amount' => $newAmount,
                'status' => $newAmount <= 0 ? 'cancelled' : $deduction->status,
            ]);
        }

        return ['status' => 'settled', 'deposit_transaction_id' => null, 'point_refunded' => null];
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

        $member = Member::findOrFail($payment->sale->member_id);
        $this->pointService->refund($member, $payment->point_used, $payment->sale);
    }

    private function refundCredit(SalePayment $payment, int $amount): void
    {
        $receivable = Receivable::where('sale_id', $payment->sale_id)->first();

        if ($receivable === null) {
            return;
        }

        // Fase 11 (T-069): logika pengurangan piutang dipakai dari 2
        // tempat (di sini untuk pembalikan penuh 1 baris pembayaran saat
        // void, dan SaleReturnService::refundPartial() untuk retur
        // sebagian) — satu sumber kebenaran di ReceivableService, mirip
        // DebtService::reduceFromReturn() untuk retur pembelian.
        $this->receivableService->reduceFromReturn($receivable, $amount);
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
