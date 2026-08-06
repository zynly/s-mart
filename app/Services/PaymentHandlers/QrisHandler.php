<?php

namespace App\Services\PaymentHandlers;

use App\Models\CashierSession;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Services\CashierSessionService;
use DomainException;

/**
 * Dipakai untuk type qris, ewallet, dan transfer — ketiganya berbagi
 * bentuk aturan yang sama persis di spec (wajib ref, MDR berlaku,
 * status bisa 'pending' sampai direkonsiliasi H+1 lewat halaman
 * Pembayaran Gantung — lihat SalePaymentController::settle()).
 * Ticket T-056 hanya menyebut 8 handler (tanpa Ewallet/Transfer
 * terpisah) karena perilakunya memang identik dengan Qris di sini.
 */
class QrisHandler implements PaymentHandler
{
    public function __construct(private readonly CashierSessionService $sessionService) {}

    public function handle(Sale $sale, PaymentMethod $method, array $payload, ?Member $member, CashierSession $session, Outlet $outlet): SalePayment
    {
        $referenceNo = trim((string) ($payload['reference_no'] ?? ''));

        if ($referenceNo === '') {
            throw new DomainException("Metode \"{$method->name}\" membutuhkan nomor referensi.");
        }

        $amount = (int) $payload['amount'];
        $mdrPercent = (float) $method->mdr_percent;
        $mdrAmount = (int) round($amount * $mdrPercent / 100);
        $netAmount = $amount - $mdrAmount;

        $this->sessionService->addSaleNoncash($session, $amount);

        // Integrasi Midtrans — 'settlement'/'capture' berarti frontend
        // sudah menerima konfirmasi SUKSES dari snap.pay() (GoPay/QRIS/
        // e-wallet, biasanya instan) SEBELUM sale ini disubmit — aman
        // langsung 'settled', tidak perlu menunggu rekonsiliasi manual.
        // 'pending' (mis. VA bank belum ditransfer) atau tidak ada
        // gateway_status sama sekali (reference_no diketik manual/EDC)
        // tetap 'pending' seperti semula.
        $isGatewayConfirmed = in_array($payload['gateway_status'] ?? null, ['settlement', 'capture'], true);

        return SalePayment::create([
            'sale_id' => $sale->id,
            'payment_method_id' => $method->id,
            'amount' => $amount,
            'cash_account_id' => $method->cash_account_id,
            'reference_no' => $referenceNo,
            'mdr_percent' => $mdrPercent,
            'mdr_amount' => $mdrAmount,
            'net_amount' => $netAmount,
            'status' => $isGatewayConfirmed ? 'settled' : 'pending',
            'settled_at' => $isGatewayConfirmed ? now() : null,
        ]);
    }
}
