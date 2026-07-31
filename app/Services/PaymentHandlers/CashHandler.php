<?php

namespace App\Services\PaymentHandlers;

use App\Models\CashierSession;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Services\CashierSessionService;

/**
 * Satu-satunya metode yang boleh menghasilkan kembalian.
 */
class CashHandler implements PaymentHandler
{
    public function __construct(private readonly CashierSessionService $sessionService) {}

    public function handle(Sale $sale, PaymentMethod $method, array $payload, ?Member $member, CashierSession $session, Outlet $outlet): SalePayment
    {
        $amount = (int) $payload['amount'];
        $received = (int) ($payload['received_amount'] ?? $amount);
        $change = max(0, $received - $amount);

        $this->sessionService->addSaleCash($session, $amount);

        return SalePayment::create([
            'sale_id' => $sale->id,
            'payment_method_id' => $method->id,
            'amount' => $amount,
            'received_amount' => $received,
            'change_amount' => $change,
            'cash_account_id' => $session->cash_account_id,
            'net_amount' => $amount,
            'status' => 'settled',
            'settled_at' => now(),
        ]);
    }
}
