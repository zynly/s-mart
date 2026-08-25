<?php

namespace App\Services\PaymentHandlers;

use App\Exceptions\InvalidPinException;
use App\Exceptions\MemberPinNotSetException;
use App\Models\CashierSession;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Services\CashierSessionService;
use App\Services\DepositService;
use App\Services\MemberLimitService;
use App\Services\MemberPinService;
use DomainException;

/**
 * Cek limit harian/mingguan dulu, lalu wajib PIN kecuali nominal di
 * bawah config('pos.no_pin_threshold'). Bila santri belum punya PIN,
 * lempar MemberPinNotSetException — kasir mengarahkan ke alur buat
 * PIN, bukan menolak transaksi begitu saja (CATATAN-PERBAIKAN § Fase 9).
 */
class DepositHandler implements PaymentHandler
{
    public function __construct(
        private readonly DepositService $depositService,
        private readonly CashierSessionService $sessionService,
        private readonly MemberPinService $pinService,
        private readonly MemberLimitService $limitService,
    ) {}

    public function handle(Sale $sale, PaymentMethod $method, array $payload, ?Member $member, CashierSession $session, Outlet $outlet): SalePayment
    {
        if ($member === null) {
            throw new DomainException('Metode Saldo Deposit membutuhkan anggota yang terpilih.');
        }

        $amount = (int) $payload['amount'];

        $limitCheck = $this->limitService->checkSpendingLimit($member, $amount);

        if (! $limitCheck['allowed']) {
            throw new DomainException($limitCheck['reason']);
        }

        if ($member->pin === null) {
            throw MemberPinNotSetException::make();
        }

        if (! $this->pinService->verify($member, (string) ($payload['pin'] ?? ''))) {
            throw InvalidPinException::make();
        }

        $trx = $this->depositService->charge(
            $member,
            $amount,
            $sale,
            "{$sale->idempotency_key}-deposit-{$method->id}",
            $outlet->id,
            $session->id,
        );

        $this->sessionService->addSaleDeposit($session, $amount);

        return SalePayment::create([
            'sale_id' => $sale->id,
            'payment_method_id' => $method->id,
            'amount' => $amount,
            'net_amount' => $amount,
            'deposit_transaction_id' => $trx->id,
            'status' => 'settled',
            'settled_at' => now(),
        ]);
    }
}
