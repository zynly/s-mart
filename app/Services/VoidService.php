<?php

namespace App\Services;

use App\Models\CashierSession;
use App\Models\Member;
use App\Models\Promo;
use App\Models\Receivable;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockLayerConsumption;
use App\Models\User;
use DomainException;
use Illuminate\Support\Facades\DB;

/**
 * T-070. Diekstrak dari SaleService::void() (Fase 8-10) supaya Fase 11
 * punya tempat sendiri untuk menambah pembalikan kupon (T-071) dan
 * piutang tanpa terus menumpuk di SaleService. SaleService::void()
 * sekarang cuma delegasi 1 baris ke sini (pola sama seperti
 * PaymentService::canUseCredit() -> CreditHandler).
 */
class VoidService
{
    public function __construct(
        private readonly StockService $stockService,
        private readonly PaymentService $paymentService,
        private readonly PointService $pointService,
        private readonly CashierSessionService $sessionService,
        private readonly VoucherService $voucherService,
        private readonly ReceivableService $receivableService,
    ) {}

    public function void(Sale $sale, string $reason, ?User $approver = null): Sale
    {
        if ($approver === null || ! $approver->can('sale.void')) {
            throw new DomainException('Void wajib disetujui PIN supervisor (permission sale.void).');
        }

        return DB::transaction(function () use ($sale, $reason, $approver) {
            $locked = Sale::lockForUpdate()->findOrFail($sale->id);

            if ($locked->status !== 'completed') {
                throw new DomainException('Hanya nota berstatus selesai yang bisa dibatalkan.');
            }

            // Audit Fase 6 (Temuan Sedang): sebelumnya SELECT biasa tanpa
            // lock — sesi bisa ditutup oleh transaksi lain (closePeriod
            // sesi kasir) tepat di tengah void ini, dan void tetap lanjut
            // menambah counter ke sesi yang sudah closed di database.
            $session = CashierSession::lockForUpdate()->findOrFail($locked->cashier_session_id);

            if ($session->status !== 'open') {
                throw new DomainException('Sesi kasir nota ini sudah tutup — void tidak diperbolehkan (gunakan retur).');
            }

            foreach ($locked->items as $item) {
                $consumptions = StockLayerConsumption::where('consumableable_type', SaleItem::class)
                    ->where('consumableable_id', $item->id)
                    ->where('is_returned', false)
                    ->get();

                // Audit Fase 6 (Temuan Tinggi): qty_before sebelumnya
                // diambil SESUDAH returnToLayer() dijalankan (mencatat
                // stok yang SUDAH bertambah sebagai "sebelum" — audit
                // trail movement salah). Diambil di sini, sebelum mutasi,
                // sama seperti pola SaleReturnService::restockItem().
                $qtyBefore = $this->stockService->getAvailable($item->product, $locked->outlet);
                $qtyReturnedNow = 0.0;

                foreach ($consumptions as $consumption) {
                    // Audit Fase 6 (Temuan Tinggi): sebelumnya kirim qty
                    // ASLI PENUH konsumsi, bukan sisa yang belum diretur —
                    // untuk baris yang sudah pernah diretur SEBAGIAN
                    // (qty_returned>0 tapi is_returned masih false),
                    // returnToLayer() menolak (qty baru > qty konsumsi
                    // asli) dan VOID jadi tidak bisa dipakai sama sekali
                    // untuk nota yang pernah diretur sebagian — pesan
                    // errornya pun menyesatkan (seolah user salah input).
                    $remaining = (float) $consumption->qty - (float) $consumption->qty_returned;

                    if ($remaining <= 0) {
                        continue;
                    }

                    $this->stockService->returnToLayer($consumption, $remaining);
                    $qtyReturnedNow += $remaining;
                }

                if ($qtyReturnedNow <= 0) {
                    continue;
                }

                $this->stockService->recordMovement(
                    $item->product,
                    $locked->outlet,
                    'sale_return',
                    $qtyReturnedNow,
                    $qtyBefore,
                    $item->unit_cost,
                    $locked,
                    "Void: {$reason}",
                );
            }

            foreach ($locked->payments as $payment) {
                if ($payment->status === 'refunded') {
                    continue;
                }

                $this->paymentService->refund($payment, $session);
            }

            if ($locked->member_id !== null && $locked->points_earned > 0) {
                $this->pointService->voidEarn(Member::findOrFail($locked->member_id), $locked->points_earned, $locked);
            }

            $promoIds = $locked->items()->whereNotNull('promo_id')->pluck('promo_id')->unique();

            foreach ($promoIds as $promoId) {
                Promo::whereKey($promoId)->where('used_count', '>', 0)->decrement('used_count');
            }

            // T-071: kupon kembali ke status 'active' (bila belum expired)
            // dan coupon_redemptions.is_reverted=true.
            $redemption = $locked->couponRedemption()->where('is_reverted', false)->first();

            if ($redemption !== null) {
                $this->voucherService->revertCoupon($redemption);
            }

            // Piutang (nota kredit) dibatalkan seluruhnya — refundCredit()
            // di atas (lewat PaymentService::refund() -> refundCredit())
            // sudah menzerokan total/remaining, di sini statusnya ditimpa
            // jadi 'cancelled' (bukan 'paid') supaya laporan piutang tidak
            // menyesatkan.
            $receivable = Receivable::where('sale_id', $locked->id)->first();

            if ($receivable !== null) {
                $this->receivableService->cancelFromVoid($receivable);
            }

            // Jurnal pembalik (reversing entry) untuk void ini: ditunda ke
            // Fase 13. Modul akuntansi (journals/journal_entries +
            // JournalService) belum ada, jadi tidak ada yang bisa dibalik.
            // Semua data yang dibutuhkan jurnal (grand_total, total_cost,
            // rincian refund per metode di sale_payments) sudah tersimpan
            // sehingga Fase 13 bisa membangunnya tanpa migrasi data ulang.

            $this->sessionService->addVoid($session);

            $locked->update([
                'status' => 'void',
                'void_reason' => $reason,
                'voided_by' => $approver->id,
                'voided_at' => now(),
            ]);

            return $locked;
        });
    }
}
