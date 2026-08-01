<?php

namespace App\Observers;

use App\Models\Journal;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockLayerConsumption;
use App\Services\JournalService;

/**
 * T-081. Sale WAJIB berjurnal otomatis (CATATAN-PERBAIKAN.md §Fase13).
 * Bagian tersulit: satu nota bisa berisi CAMPURAN barang reguler +
 * konsinyasi sekaligus — sale_items tidak punya flag is_consignment,
 * jadi diturunkan per baris lewat stock_layer_consumptions ->
 * stock_layers.is_consignment (pola sama seperti ConsignmentService::
 * calculateSettlement()). Peta konsinyasi yang dipakai adalah hasil
 * KOREKSI CATATAN-PERBAIKAN.md, BUKAN peta di spec asli (yang keliru
 * mengakui "Penjualan" penuh atas barang yang bukan aset sekolah).
 */
class SaleObserver
{
    public function __construct(private readonly JournalService $journalService) {}

    public function created(Sale $sale): void
    {
        if ($sale->status === 'completed') {
            $this->maybeJournalizeSale($sale);
        }
    }

    /**
     * SaleService::complete() membuat Sale::create() SEBELUM SaleItem/
     * SalePayment ada (observer created() masih melihat keranjang
     * kosong), baru melengkapinya lewat SATU $sale->update() di akhir
     * (total_cost/paid_amount/dst). Jurnal HARUS menunggu titik itu —
     * maybeJournalizeSale() idempoten (guard exists()) supaya aman
     * dipanggil dari created() maupun updated() tanpa risiko dobel.
     */
    public function updated(Sale $sale): void
    {
        if ($sale->wasChanged('status') && $sale->status === 'void') {
            $journal = Journal::where('sourceable_type', Sale::class)
                ->where('sourceable_id', $sale->id)
                ->where('status', 'posted')
                ->first();

            if ($journal !== null) {
                $this->journalService->reverse($journal, "Void nota {$sale->reference}: {$sale->void_reason}");
            }

            return;
        }

        if ($sale->status === 'completed') {
            $this->maybeJournalizeSale($sale);
        }
    }

    private function maybeJournalizeSale(Sale $sale): void
    {
        $alreadyJournaled = Journal::where('sourceable_type', Sale::class)->where('sourceable_id', $sale->id)->exists();

        if ($alreadyJournaled) {
            return;
        }

        $sale->load(['items.product', 'payments.paymentMethod', 'payments.cashAccount']);

        if ($sale->items->isEmpty() || $sale->payments->isEmpty()) {
            return;
        }

        $this->journalizeSale($sale);
    }

    private function journalizeSale(Sale $sale): void
    {
        $entries = [];
        $regularSubtotal = 0;
        $consignmentSubtotal = 0;
        $consignmentCommission = 0;
        $regularCost = 0;

        foreach ($sale->items as $item) {
            [$itemRegularSubtotal, $itemConsignmentSubtotal, $itemRegularCost, $itemCommission] = $this->splitItem($item);

            $regularSubtotal += $itemRegularSubtotal;
            $consignmentSubtotal += $itemConsignmentSubtotal;
            $regularCost += $itemRegularCost;
            $consignmentCommission += $itemCommission;
        }

        if ($regularSubtotal > 0) {
            $entries[] = ['account_code' => '4-1000', 'debit' => 0, 'credit' => $regularSubtotal, 'description' => 'Penjualan barang reguler'];
        }

        if ($consignmentSubtotal > 0) {
            $entries[] = ['account_code' => '2-1300', 'debit' => 0, 'credit' => $consignmentSubtotal, 'description' => 'Penjualan barang konsinyasi'];
        }

        if ($consignmentCommission > 0) {
            $entries[] = ['account_code' => '2-1300', 'debit' => $consignmentCommission, 'credit' => 0, 'description' => 'Pengakuan komisi konsinyasi'];
            $entries[] = ['account_code' => '4-1300', 'debit' => 0, 'credit' => $consignmentCommission, 'description' => 'Pengakuan komisi konsinyasi'];
        }

        if ($regularCost > 0) {
            $entries[] = ['account_code' => '5-1000', 'debit' => $regularCost, 'credit' => 0];
            $entries[] = ['account_code' => '1-1600', 'debit' => 0, 'credit' => $regularCost];
        }

        // Diskon level-nota (bill_discount + promo bill-level + coupon) —
        // diskon per-item SUDAH bersih di sale_items.subtotal, jangan
        // didobel. Skenario campur reguler+konsinyasi: seluruh diskon
        // level-nota dibukukan ke Diskon Penjualan tanpa proporsi persis
        // ke konsinyasi (jarang terjadi, disederhanakan secara sadar).
        $billLevelDiscount = (int) $sale->total_discount - (int) $sale->item_discount;

        if ($billLevelDiscount > 0) {
            $entries[] = ['account_code' => '4-1200', 'debit' => $billLevelDiscount, 'credit' => 0, 'description' => 'Diskon level nota'];
        }

        foreach ($sale->payments as $payment) {
            $method = $payment->paymentMethod;

            if (in_array($method->type, ['voucher', 'point'], true)) {
                $entries[] = ['account_code' => '4-1200', 'debit' => $payment->amount, 'credit' => 0, 'description' => "Bayar via {$method->name}"];

                continue;
            }

            $accountCode = $this->journalService->resolvePaymentMethodAccountCode($method, $payment->cashAccount);

            if ((int) $payment->mdr_amount > 0) {
                $entries[] = ['account_code' => $accountCode, 'debit' => $payment->net_amount, 'credit' => 0, 'description' => "Bayar via {$method->name} (net MDR)"];
                $entries[] = ['account_code' => '6-1300', 'debit' => $payment->mdr_amount, 'credit' => 0, 'description' => "MDR {$method->name}"];
            } else {
                $entries[] = ['account_code' => $accountCode, 'debit' => $payment->amount, 'credit' => 0, 'description' => "Bayar via {$method->name}"];
            }
        }

        // sales.rounding/sales.tax belum pernah diisi di manapun oleh
        // SaleService::complete() saat ini (selalu 0) — baris ini murni
        // jaring pengaman kalau suatu saat diaktifkan, bukan kode mati
        // yang disengaja diam-diam.
        if ((int) $sale->rounding !== 0) {
            $entries[] = $sale->rounding > 0
                ? ['account_code' => '4-2200', 'debit' => 0, 'credit' => $sale->rounding, 'description' => 'Pembulatan']
                : ['account_code' => '4-2200', 'debit' => abs($sale->rounding), 'credit' => 0, 'description' => 'Pembulatan'];
        }

        if ($entries === []) {
            return;
        }

        $this->journalService->record('sales', $entries, $sale, $sale->sale_date, "Penjualan {$sale->reference}", $sale->outlet_id);
    }

    /**
     * @return array{0:int, 1:int, 2:int, 3:int} [regularSubtotal, consignmentSubtotal, regularCost, commission]
     */
    private function splitItem(SaleItem $item): array
    {
        $consumptions = StockLayerConsumption::where('consumableable_type', SaleItem::class)
            ->where('consumableable_id', $item->id)
            ->with('stockLayer:id,is_consignment')
            ->get();

        $totalQty = (float) $consumptions->sum('qty');
        $consignmentQty = (float) $consumptions->filter(fn (StockLayerConsumption $c) => (bool) $c->stockLayer?->is_consignment)->sum('qty');
        $consignmentRatio = $totalQty > 0 ? $consignmentQty / $totalQty : 0.0;

        $consignmentSubtotal = (int) round($item->subtotal * $consignmentRatio);
        $regularSubtotal = $item->subtotal - $consignmentSubtotal;
        $regularCost = (int) round((int) $item->total_cost * (1 - $consignmentRatio));

        $commission = 0;

        if ($consignmentSubtotal > 0) {
            $percent = (int) ($item->product->consignment_percent ?? 0);
            $commission = (int) round($consignmentSubtotal * $percent / 100);
        }

        return [$regularSubtotal, $consignmentSubtotal, $regularCost, $commission];
    }
}
