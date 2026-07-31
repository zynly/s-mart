<?php

namespace App\Services;

use App\Models\Exchange;
use App\Models\User;
use App\Support\ReferenceGenerator;
use Illuminate\Support\Facades\DB;

/**
 * T-072 bagian tukar barang. Sesuai keputusan cakupan Fase 11 (layar
 * dua-panel penuh ditunda ke Fase UI-01): retur barang keluar dan nota
 * baru barang masuk diproses sebagai DUA transaksi independen lewat
 * SaleReturnService::createAndProcess() dan SaleService::complete() yang
 * sudah ada — masing-masing menyelesaikan uangnya sendiri (retur
 * mengikuti ADR-0007 seperti biasa, nota baru dibayar kasir seperti
 * transaksi normal lewat layar POS). Exchange hanya menautkan keduanya
 * untuk audit + menghitung price_difference sebagai info pelaporan,
 * TIDAK ada uang yang "di-netting" secara implisit di sini — menghindari
 * membangun ulang logika alokasi pembayaran yang sudah ada di tempat lain.
 */
class ExchangeService
{
    public function __construct(
        private readonly SaleReturnService $saleReturnService,
        private readonly SaleService $saleService,
    ) {}

    /**
     * @param  array<string, mixed>  $returnData  Bentuk sama seperti SaleReturnService::createAndProcess()
     * @param  array<string, mixed>  $newSaleCart  Bentuk sama seperti SaleService::complete()
     */
    public function process(array $returnData, array $newSaleCart, ?User $approver, string $idempotencyKey): Exchange
    {
        return DB::transaction(function () use ($returnData, $newSaleCart, $approver, $idempotencyKey) {
            $existing = Exchange::where('idempotency_key', $idempotencyKey)->first();

            if ($existing !== null) {
                return $existing;
            }

            $saleReturn = $this->saleReturnService->createAndProcess($returnData, $approver);
            $newSale = $this->saleService->complete($newSaleCart);

            $priceDifference = $newSale->grand_total - $saleReturn->total;

            $settlement = match (true) {
                $priceDifference > 0 => 'cash_in',
                $priceDifference < 0 => 'cash_out',
                default => 'none',
            };

            return Exchange::create([
                'reference' => ReferenceGenerator::generate('TKR', $saleReturn->outlet_id),
                'sale_return_id' => $saleReturn->id,
                'new_sale_id' => $newSale->id,
                'outlet_id' => $saleReturn->outlet_id,
                'price_difference' => $priceDifference,
                'settlement' => $settlement,
                'idempotency_key' => $idempotencyKey,
                'created_by' => $approver?->id ?? auth()->id(),
            ]);
        });
    }
}
