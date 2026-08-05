<?php

namespace App\Services;

use App\Models\SaleReturnItem;
use App\Models\StockLayer;
use App\Models\StockTransferItem;
use App\Models\StockWriteOff;
use App\Models\User;
use App\Support\ReferenceGenerator;
use DomainException;
use Illuminate\Support\Facades\DB;

/**
 * T-072 bagian write-off. Dua jalur:
 *   - Manual (gudang menemukan barang rusak/hilang): request() -> approve() -> process().
 *   - Otomatis dari retur barang rusak (SaleReturnService): createFromReturn()
 *     — request+approve+process sekaligus dalam SATU transaksi supaya
 *     barang rusak tidak sempat ditawarkan lagi lewat FEFO.
 */
class WriteOffService
{
    public function __construct(private readonly StockService $stockService) {}

    /**
     * @param  array{outlet_id:int, product_id:int, stock_layer_id?:int, qty:float,
     *     type:string, reason:string, attachment?:string}  $data
     */
    public function request(array $data, User $requester): StockWriteOff
    {
        // Audit Fase 6 (Temuan Tinggi): layer WAJIB dipilih untuk jalur
        // manual (pertahanan berlapis — StoreWriteOffRequest sudah
        // mewajibkan ini juga) — TANPA layer, applyStockReduction() tidak
        // punya apapun untuk dikurangi ("stok fantom"). Layer juga WAJIB
        // cocok outlet & produk yang disubmit — sebelumnya tidak pernah
        // diverifikasi, layer produk/outlet LAIN bisa dipakai (isolasi
        // multi-outlet bocor, produk yang salah yang berkurang stoknya).
        $layer = StockLayer::findOrFail($data['stock_layer_id']);

        if ((int) $layer->outlet_id !== (int) $data['outlet_id'] || (int) $layer->product_id !== (int) $data['product_id']) {
            throw new DomainException('Layer stok yang dipilih tidak cocok dengan produk/outlet write-off ini.');
        }

        $unitCost = $layer->unit_cost;
        $qty = (float) $data['qty'];

        return StockWriteOff::create([
            'reference' => ReferenceGenerator::generate('WO', $data['outlet_id']),
            'outlet_id' => $data['outlet_id'],
            'product_id' => $data['product_id'],
            'stock_layer_id' => $layer?->id,
            'qty' => $qty,
            'unit_cost' => $unitCost,
            'total_cost' => (int) round($qty * $unitCost),
            'type' => $data['type'],
            'reason' => $data['reason'],
            'attachment' => $data['attachment'] ?? null,
            'status' => 'draft',
            'requested_by' => $requester->id,
        ]);
    }

    public function approve(StockWriteOff $writeOff, User $approver): StockWriteOff
    {
        return DB::transaction(function () use ($writeOff, $approver) {
            $locked = StockWriteOff::lockForUpdate()->findOrFail($writeOff->id);

            if ($locked->status !== 'draft') {
                throw new DomainException('Hanya pengajuan write-off berstatus draft yang bisa disetujui.');
            }

            $locked->update([
                'status' => 'approved',
                'approved_by' => $approver->id,
                'approved_at' => now(),
            ]);

            return $locked;
        });
    }

    public function process(StockWriteOff $writeOff): StockWriteOff
    {
        return DB::transaction(function () use ($writeOff) {
            $locked = StockWriteOff::lockForUpdate()->findOrFail($writeOff->id);

            if ($locked->status !== 'approved') {
                throw new DomainException('Hanya write-off berstatus approved yang bisa diproses.');
            }

            $this->applyStockReduction($locked);

            $locked->update(['status' => 'completed']);

            return $locked;
        });
    }

    public function reject(StockWriteOff $writeOff, User $approver, string $reason): StockWriteOff
    {
        return DB::transaction(function () use ($writeOff, $approver, $reason) {
            $locked = StockWriteOff::lockForUpdate()->findOrFail($writeOff->id);

            if ($locked->status !== 'draft') {
                throw new DomainException('Hanya pengajuan write-off berstatus draft yang bisa ditolak.');
            }

            $locked->update([
                'status' => 'rejected',
                'approved_by' => $approver->id,
                'approved_at' => now(),
                'reason' => trim("{$locked->reason} (Ditolak: {$reason})"),
            ]);

            return $locked;
        });
    }

    /**
     * Retur barang rusak: request+approve+process sekaligus dalam
     * transaksi yang sama dengan SaleReturnService::createAndProcess()
     * (dipanggil dari sana) — barang sudah dikembalikan ke layer asal
     * lewat StockService::returnToLayer() SEBELUM method ini dipanggil,
     * di sini tinggal dikurangi lagi permanen dari layer yang sama.
     */
    public function createFromReturn(SaleReturnItem $returnItem, ?User $approver): StockWriteOff
    {
        return DB::transaction(function () use ($returnItem, $approver) {
            $layer = $returnItem->stockLayerConsumption?->stockLayer;

            $writeOff = StockWriteOff::create([
                'reference' => ReferenceGenerator::generate('WO', $returnItem->saleReturn->outlet_id),
                'outlet_id' => $returnItem->saleReturn->outlet_id,
                'product_id' => $returnItem->product_id,
                'stock_layer_id' => $layer?->id,
                'sale_return_item_id' => $returnItem->id,
                'qty' => (float) $returnItem->qty_base,
                'unit_cost' => $returnItem->unit_cost,
                'total_cost' => $returnItem->total_cost,
                'type' => 'damaged',
                'reason' => 'Retur barang rusak',
                'status' => 'approved',
                'requested_by' => $approver?->id ?? auth()->id(),
                'approved_by' => $approver?->id,
                'approved_at' => $approver !== null ? now() : null,
            ]);

            $this->applyStockReduction($writeOff);

            $writeOff->update(['status' => 'completed']);
            $returnItem->update(['stock_write_off_id' => $writeOff->id]);

            return $writeOff;
        });
    }

    /**
     * Transfer (Fase 12): qty_received < qty_sent. Beda dari
     * createFromReturn(), di sini TIDAK ADA pengurangan stok tambahan —
     * StockService::consume() di TransferService::send() SUDAH
     * mengurangi qty_sent penuh dari outlet asal (barang dianggap
     * "keluar" saat itu juga), jadi baris yang tidak pernah sampai ini
     * murni pencatatan audit/pelaporan ("kenapa transfer_out lebih
     * besar dari transfer_in"), bukan mutasi stok kedua kalinya —
     * memanggil reduceLayer()/recordMovement() lagi di sini akan
     * dobel-hitung kehilangan yang sama.
     */
    public function createFromTransferShortfall(StockTransferItem $transferItem, float $shortQty, ?User $approver): StockWriteOff
    {
        $writeOff = StockWriteOff::create([
            'reference' => ReferenceGenerator::generate('WO', $transferItem->transfer->from_outlet_id),
            'outlet_id' => $transferItem->transfer->from_outlet_id,
            'product_id' => $transferItem->product_id,
            'stock_layer_id' => null,
            'qty' => $shortQty,
            'unit_cost' => $transferItem->unit_cost,
            'total_cost' => (int) round($shortQty * $transferItem->unit_cost),
            'type' => 'lost',
            'reason' => "Hilang dalam perjalanan — transfer {$transferItem->transfer->reference}",
            'status' => 'completed',
            'requested_by' => $approver?->id ?? auth()->id(),
            'approved_by' => $approver?->id,
            'approved_at' => $approver !== null ? now() : null,
        ]);

        return $writeOff;
    }

    private function applyStockReduction(StockWriteOff $writeOff): void
    {
        $layer = $writeOff->stock_layer_id !== null ? StockLayer::findOrFail($writeOff->stock_layer_id) : null;
        $product = $writeOff->product;
        $outlet = $writeOff->outlet;
        $qtyBefore = $this->stockService->getAvailable($product, $outlet);

        if ($layer !== null) {
            $this->stockService->reduceLayer($layer, (float) $writeOff->qty);
        }

        $this->stockService->recordMovement(
            $product,
            $outlet,
            'write_off',
            -(float) $writeOff->qty,
            $qtyBefore,
            $writeOff->unit_cost,
            $writeOff,
            "Write-off: {$writeOff->reason}",
            $layer?->id,
        );
    }
}
