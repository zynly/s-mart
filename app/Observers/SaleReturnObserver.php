<?php

namespace App\Observers;

use App\Models\Journal;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Models\StockLayerConsumption;
use App\Services\JournalService;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

/**
 * T-081. BUKAN reversal dari jurnal Sale asli (beda dari Void) — retur
 * bisa parsial dan refund-nya bisa ke metode BEDA dari pembayaran asli
 * (ADR-0007), jadi selalu jurnal baru sendiri, dihitung dari
 * sale_returns.total/total_cost + breakdown sale_return_refunds.
 *
 * SaleReturnService::createAndProcess() membuat SaleReturn::create()
 * dengan status='completed' LANGSUNG (bukan draft->update), lalu
 * items/refunds ditulis SESUDAHNYA dalam transaksi yang sama — kalau
 * observer dengar di created() secara normal, keranjang masih kosong
 * (bug yang sama persis awalnya ditemukan di SaleObserver). Solusi
 * yang lebih tahan lama: implement ShouldHandleEventsAfterCommit
 * supaya Laravel menunda event ini sampai transaksi benar-benar
 * commit — items/refunds pasti sudah ada saat handler ini jalan.
 */
class SaleReturnObserver implements ShouldHandleEventsAfterCommit
{
    public function __construct(private readonly JournalService $journalService) {}

    public function created(SaleReturn $saleReturn): void
    {
        if ($saleReturn->status === 'completed') {
            $this->journalizeReturn($saleReturn);
        }
    }

    private function journalizeReturn(SaleReturn $saleReturn): void
    {
        $alreadyJournaled = Journal::where('sourceable_type', SaleReturn::class)->where('sourceable_id', $saleReturn->id)->exists();

        if ($alreadyJournaled) {
            return;
        }

        $saleReturn->load(['items.product', 'refunds.paymentMethod']);
        $entries = [];

        $regularSubtotal = 0;
        $consignmentSubtotal = 0;
        $regularCostRestocked = 0;
        $consignmentCommissionReversal = 0;

        foreach ($saleReturn->items as $item) {
            $consignmentRatio = $this->consignmentRatio($item);
            $itemConsignmentSubtotal = (int) round($item->subtotal * $consignmentRatio);
            $itemRegularSubtotal = $item->subtotal - $itemConsignmentSubtotal;

            $regularSubtotal += $itemRegularSubtotal;
            $consignmentSubtotal += $itemConsignmentSubtotal;

            if ($item->restock) {
                $regularCostRestocked += (int) round((int) $item->total_cost * (1 - $consignmentRatio));
            }

            if ($itemConsignmentSubtotal > 0) {
                $percent = (int) ($item->product->consignment_percent ?? 0);
                $consignmentCommissionReversal += (int) round($itemConsignmentSubtotal * $percent / 100);
            }
        }

        if ($regularSubtotal > 0) {
            $entries[] = ['account_code' => '4-1100', 'debit' => $regularSubtotal, 'credit' => 0, 'description' => 'Retur penjualan barang reguler'];
        }

        if ($consignmentSubtotal > 0) {
            $entries[] = ['account_code' => '2-1300', 'debit' => $consignmentSubtotal, 'credit' => 0, 'description' => 'Retur penjualan barang konsinyasi'];
        }

        if ($consignmentCommissionReversal > 0) {
            $entries[] = ['account_code' => '4-1300', 'debit' => $consignmentCommissionReversal, 'credit' => 0, 'description' => 'Pembalikan komisi konsinyasi'];
            $entries[] = ['account_code' => '2-1300', 'debit' => 0, 'credit' => $consignmentCommissionReversal, 'description' => 'Pembalikan komisi konsinyasi'];
        }

        if ($regularCostRestocked > 0) {
            $entries[] = ['account_code' => '1-1600', 'debit' => $regularCostRestocked, 'credit' => 0];
            $entries[] = ['account_code' => '5-1000', 'debit' => 0, 'credit' => $regularCostRestocked];
        }

        foreach ($saleReturn->refunds as $refund) {
            if ($refund->status === 'failed' || $refund->amount <= 0) {
                continue;
            }

            $entries[] = ['account_code' => $this->refundAccountCode($refund), 'debit' => 0, 'credit' => $refund->amount, 'description' => 'Refund '.$refund->target];
        }

        if ($entries === []) {
            return;
        }

        $this->journalService->record('sales', $entries, $saleReturn, $saleReturn->return_date, "Retur penjualan {$saleReturn->reference}", $saleReturn->outlet_id);
    }

    private function refundAccountCode($refund): string
    {
        if ($refund->target === 'deposit') {
            return '2-1200';
        }

        if ($refund->target === 'transfer') {
            return '1-1201';
        }

        if ($refund->target === 'forfeited') {
            // Voucher hangus (Fase 10/11): toko tidak keluar uang untuk
            // porsi ini padahal revenue-nya sudah dibalik — selisihnya
            // diakui sebagai pendapatan lain-lain, bukan diam-diam
            // membuat jurnal timpang. 4-2000 sendiri header (bukan leaf,
            // punya anak 4-2100/4-2200) — pakai 4-2300 (ditambahkan di
            // Fase 13 saat implementasi, lihat AccountSeeder).
            return '4-2300';
        }

        // target='same' -> ikuti metode asal. point/voucher tidak pernah
        // jadi akun neraca (sama seperti sisi debit SaleObserver) --
        // dibalik ke Diskon Penjualan, bukan akun kas/piutang.
        $method = $refund->paymentMethod;

        if ($method !== null && in_array($method->type, ['point', 'voucher'], true)) {
            return '4-1200';
        }

        return $method !== null ? $this->journalService->resolvePaymentMethodAccountCode($method) : '1-1101';
    }

    private function consignmentRatio(SaleReturnItem $item): float
    {
        if ($item->sale_item_id === null) {
            return 0.0;
        }

        $consumptions = StockLayerConsumption::where('consumableable_type', SaleItem::class)
            ->where('consumableable_id', $item->sale_item_id)
            ->with('stockLayer:id,is_consignment')
            ->get();

        $totalQty = (float) $consumptions->sum('qty');

        if ($totalQty <= 0) {
            return 0.0;
        }

        $consignmentQty = (float) $consumptions->filter(fn (StockLayerConsumption $c) => (bool) $c->stockLayer?->is_consignment)->sum('qty');

        return $consignmentQty / $totalQty;
    }
}
