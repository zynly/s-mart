<?php

namespace App\Services\PaymentHandlers;

use App\Models\CashierSession;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\SalePayment;

interface PaymentHandler
{
    /**
     * @param  array<string, mixed>  $payload  Satu baris dari array `payments` milik satu nota
     *                                         (lihat PaymentService::process()) — bentuknya beda per metode: cash butuh
     *                                         received_amount, deposit butuh pin, card/qris/transfer butuh reference_no, dst.
     */
    public function handle(Sale $sale, PaymentMethod $method, array $payload, ?Member $member, CashierSession $session, Outlet $outlet): SalePayment;
}
