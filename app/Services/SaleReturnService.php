<?php

namespace App\Services;

use App\Models\CashierSession;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Models\SaleReturnRefund;
use App\Models\StockLayerConsumption;
use App\Models\User;
use App\Support\ReferenceGenerator;
use DomainException;
use Illuminate\Support\Facades\DB;

/**
 * T-069. Retur penjualan (PROMPT §Fase 11 bagian 2-3, ADR-0007).
 */
class SaleReturnService
{
    public function __construct(
        private readonly StockService $stockService,
        private readonly PaymentService $paymentService,
        private readonly CashierSessionService $sessionService,
        private readonly WriteOffService $writeOffService,
    ) {}

    /**
     * @return array<int, array{sale_item_id:int, product_name:string, unit_code:string,
     *     unit_price:int, qty_sold:float, qty_returned:float, qty_returnable:float}>
     */
    public function getReturnableItems(Sale $sale): array
    {
        return $sale->items->map(function (SaleItem $item) {
            $qtyReturned = (float) SaleReturnItem::where('sale_item_id', $item->id)
                ->whereHas('saleReturn', fn ($q) => $q->whereIn('status', ['approved', 'completed']))
                ->sum('qty');

            return [
                'sale_item_id' => $item->id,
                'product_name' => $item->product->name,
                'unit_code' => $item->unit->code,
                'unit_price' => $item->unit_price,
                'qty_sold' => (float) $item->qty,
                'qty_returned' => $qtyReturned,
                'qty_returnable' => max(0, (float) $item->qty - $qtyReturned),
            ];
        })->all();
    }

    public function assertReturnable(Sale $sale): void
    {
        if ($sale->status !== 'completed') {
            throw new DomainException('Hanya nota berstatus selesai yang bisa diretur.');
        }

        $maxDays = (int) config('pos.return_max_days', 7);
        $daysSince = (int) floor($sale->sale_date->diffInDays(now()));

        if ($daysSince > $maxDays) {
            throw new DomainException("Batas waktu retur {$maxDays} hari sejak tanggal jual sudah lewat ({$daysSince} hari).");
        }
    }

    /**
     * ADR-0007: opsi refund per baris SalePayment asal, dialokasikan
     * proporsional dari $refundTotal (largest-remainder method — tidak
     * pernah pakai round() per baris supaya tidak bocor rupiah), lalu
     * ditentukan ke mana refund itu boleh dituju berdasarkan status
     * sesi asal nota.
     *
     * @return array{
     *     origin_session_status: string,
     *     cash_allowed: bool,
     *     lines: array<int, array{
     *         sale_payment_id:int, method_name:string, method_type:string,
     *         original_amount:int, already_refunded:int, refundable:int,
     *         allocated:int, allowed_targets: string[], default_target:string, note:?string
     *     }>,
     *     total_allocated: int,
     * }
     */
    public function calculateRefundOptions(Sale $sale, int $refundTotal): array
    {
        $originSession = $sale->cashierSession;
        $cashAllowed = $originSession !== null && $originSession->status === 'open';

        $lines = $sale->payments()
            ->where('status', '!=', 'refunded')
            ->get()
            ->map(function (SalePayment $payment) {
                $alreadyRefunded = (int) SaleReturnRefund::where('sale_payment_id', $payment->id)
                    ->where('status', '!=', 'failed')
                    ->sum('amount');

                return [
                    'payment' => $payment,
                    'method_name' => $payment->paymentMethod->name,
                    'method_type' => $payment->paymentMethod->type,
                    'original_amount' => $payment->amount,
                    'already_refunded' => $alreadyRefunded,
                    'refundable' => max(0, $payment->amount - $alreadyRefunded),
                ];
            })
            ->filter(fn ($l) => $l['refundable'] > 0)
            ->values();

        $totalRefundable = (int) $lines->sum('refundable');

        if ($refundTotal > $totalRefundable) {
            throw new DomainException("Nominal retur (Rp {$refundTotal}) melebihi sisa yang bisa diretur (Rp {$totalRefundable}).");
        }

        $allocations = $this->allocateProportionally($refundTotal, $lines->pluck('refundable')->all());

        $result = [];

        foreach ($lines as $index => $line) {
            $allocated = $allocations[$index];
            [$allowedTargets, $note] = $this->resolveTargets($line['method_type'], $cashAllowed, $sale->member_id !== null);

            $result[] = [
                'sale_payment_id' => $line['payment']->id,
                'method_name' => $line['method_name'],
                'method_type' => $line['method_type'],
                'original_amount' => $line['original_amount'],
                'already_refunded' => $line['already_refunded'],
                'refundable' => $line['refundable'],
                'allocated' => $allocated,
                'allowed_targets' => $allowedTargets,
                'default_target' => $allowedTargets[0],
                'note' => $note,
            ];
        }

        return [
            'origin_session_status' => $originSession?->status ?? 'unknown',
            'cash_allowed' => $cashAllowed,
            'lines' => $result,
            'total_allocated' => array_sum($allocations),
        ];
    }

    /**
     * Largest-remainder method: floor tiap baris dulu, lalu sisa
     * pembulatan dibagikan +1 ke baris dengan pecahan terbesar (tie-break
     * refundable terbesar, lalu indeks terkecil — deterministik supaya
     * preview di UI selalu identik dengan yang benar-benar dieksekusi).
     *
     * @param  array<int, int>  $refundables
     * @return array<int, int>
     */
    private function allocateProportionally(int $total, array $refundables): array
    {
        $sumRefundable = array_sum($refundables);

        if ($sumRefundable <= 0 || $total <= 0) {
            return array_fill(0, count($refundables), 0);
        }

        $raw = [];
        $floors = [];

        foreach ($refundables as $i => $refundable) {
            $raw[$i] = $total * $refundable / $sumRefundable;
            $floors[$i] = (int) floor($raw[$i]);
        }

        $leftover = $total - array_sum($floors);

        $fractions = [];
        foreach ($raw as $i => $value) {
            $fractions[$i] = $value - $floors[$i];
        }

        $order = array_keys($fractions);
        usort($order, function ($a, $b) use ($fractions, $refundables) {
            if ($fractions[$b] !== $fractions[$a]) {
                return $fractions[$b] <=> $fractions[$a];
            }

            if ($refundables[$b] !== $refundables[$a]) {
                return $refundables[$b] <=> $refundables[$a];
            }

            return $a <=> $b;
        });

        $result = $floors;

        for ($i = 0; $i < $leftover; $i++) {
            $result[$order[$i]]++;
        }

        return $result;
    }

    /**
     * @return array{0: string[], 1: ?string}
     */
    private function resolveTargets(string $methodType, bool $cashAllowed, bool $hasMember): array
    {
        return match ($methodType) {
            'cash' => $cashAllowed
                ? [['same'], null]
                : [
                    $hasMember ? ['deposit', 'transfer'] : ['transfer'],
                    'Sesi kasir asal nota ini sudah ditutup — laci itu sudah tidak ada, jadi refund tunai tidak bisa diambil dari laci yang sedang berjalan (ADR-0007). Dialihkan ke '.($hasMember ? 'saldo deposit atau transfer' : 'transfer').'.',
                ],
            'deposit' => [['same'], null],
            'card', 'qris', 'ewallet', 'transfer' => [['same'], 'Refund dikirim ke sumber pembayaran, status tertunda sampai dikonfirmasi.'],
            'point' => [['same'], null],
            'credit' => [['same'], null],
            'payroll' => [['same'], null],
            'voucher' => [['forfeited'], 'Voucher hangus — tidak ada nilai yang dikembalikan (aturan Fase 10).'],
            default => [['forfeited'], null],
        };
    }

    /**
     * @param  array{sale_id:int, cashier_session_id:int, reason:string, reason_detail?:string,
     *     idempotency_key:string,
     *     items: array<int, array{sale_item_id:int, qty:float, condition:string, restock:bool}>,
     *     refund_targets?: array<int, array{sale_payment_id:int, target:string}>}  $data
     */
    public function createAndProcess(array $data, ?User $approver = null): SaleReturn
    {
        return DB::transaction(function () use ($data, $approver) {
            $existing = SaleReturn::where('idempotency_key', $data['idempotency_key'])->first();

            if ($existing !== null) {
                return $existing;
            }

            $sale = Sale::lockForUpdate()->findOrFail($data['sale_id']);
            $this->assertReturnable($sale);

            $session = CashierSession::lockForUpdate()->findOrFail($data['cashier_session_id']);

            if ($session->status !== 'open') {
                throw new DomainException('Sesi kasir yang memproses retur ini harus dalam status terbuka.');
            }

            $returnableItems = collect($this->getReturnableItems($sale))->keyBy('sale_item_id');

            $subtotal = 0;
            $totalCost = 0;
            $lineInputs = [];

            foreach ($data['items'] as $input) {
                $returnable = $returnableItems->get($input['sale_item_id']);

                if ($returnable === null) {
                    throw new DomainException('Item retur tidak ditemukan pada nota ini.');
                }

                if ($input['qty'] > $returnable['qty_returnable'] + 1e-9) {
                    throw new DomainException("Qty retur untuk \"{$returnable['product_name']}\" melebihi sisa yang bisa diretur ({$returnable['qty_returnable']}).");
                }

                $saleItem = SaleItem::findOrFail($input['sale_item_id']);
                $ratio = $input['qty'] / (float) $saleItem->qty;
                $qtyBase = (float) $saleItem->qty_base * $ratio;
                $lineSubtotal = (int) round($saleItem->unit_price * $input['qty']);
                $lineCost = (int) round($saleItem->total_cost * $ratio);

                $subtotal += $lineSubtotal;
                $totalCost += $lineCost;

                $lineInputs[] = [
                    'sale_item' => $saleItem,
                    'qty' => $input['qty'],
                    'qty_base' => $qtyBase,
                    'unit_price' => $saleItem->unit_price,
                    'subtotal' => $lineSubtotal,
                    'unit_cost' => $saleItem->qty_base > 0 ? (int) round($saleItem->total_cost / (float) $saleItem->qty_base) : 0,
                    'total_cost' => $lineCost,
                    'condition' => $input['condition'],
                    'restock' => $input['restock'],
                ];
            }

            $refundOptions = $this->calculateRefundOptions($sale, $subtotal);
            $targetOverrides = collect($data['refund_targets'] ?? [])->keyBy('sale_payment_id');

            $saleReturn = SaleReturn::create([
                'reference' => ReferenceGenerator::generate('RJ', $sale->outlet_id),
                'sale_id' => $sale->id,
                'outlet_id' => $sale->outlet_id,
                'cashier_session_id' => $session->id,
                'origin_session_closed' => ! $refundOptions['cash_allowed'],
                'member_id' => $sale->member_id,
                'return_date' => now(),
                'type' => $subtotal >= $sale->grand_total ? 'full' : 'partial',
                'reason' => $data['reason'],
                'reason_detail' => $data['reason_detail'] ?? null,
                'subtotal' => $subtotal,
                'discount' => 0,
                'tax' => 0,
                'total' => $subtotal,
                'total_cost' => $totalCost,
                'status' => 'completed',
                'approved_by' => $approver?->id,
                'approved_at' => $approver !== null ? now() : null,
                'created_by' => auth()->id(),
                'idempotency_key' => $data['idempotency_key'],
            ]);

            foreach ($lineInputs as $line) {
                $saleItem = $line['sale_item'];

                $returnItem = SaleReturnItem::create([
                    'sale_return_id' => $saleReturn->id,
                    'sale_item_id' => $saleItem->id,
                    'product_id' => $saleItem->product_id,
                    'unit_id' => $saleItem->unit_id,
                    'qty' => $line['qty'],
                    'qty_base' => $line['qty_base'],
                    'unit_price' => $line['unit_price'],
                    'subtotal' => $line['subtotal'],
                    'unit_cost' => $line['unit_cost'],
                    'total_cost' => $line['total_cost'],
                    'condition' => $line['condition'],
                    'restock' => $line['restock'],
                ]);

                if ($line['restock']) {
                    $this->restockItem($saleItem, $returnItem, $line['qty_base'], $sale, $data['reason']);
                }

                if ($line['condition'] === 'damaged') {
                    $this->writeOffService->createFromReturn($returnItem, $approver);
                }
            }

            foreach ($refundOptions['lines'] as $line) {
                if ($line['allocated'] <= 0) {
                    continue;
                }

                $override = $targetOverrides->get($line['sale_payment_id']);
                $target = $override['target'] ?? $line['default_target'];

                if (! in_array($target, $line['allowed_targets'], true)) {
                    throw new DomainException("Target refund \"{$target}\" tidak diizinkan untuk metode \"{$line['method_name']}\".");
                }

                $payment = SalePayment::findOrFail($line['sale_payment_id']);
                $result = $this->paymentService->refundPartial(
                    $payment,
                    $line['allocated'],
                    $target,
                    $session,
                    $saleReturn,
                    "{$saleReturn->reference}-refund-{$payment->id}",
                );

                SaleReturnRefund::create([
                    'sale_return_id' => $saleReturn->id,
                    'sale_payment_id' => $payment->id,
                    'payment_method_id' => $payment->payment_method_id,
                    'target' => $target,
                    'amount' => $line['allocated'],
                    'point_refunded' => $result['point_refunded'],
                    'deposit_transaction_id' => $result['deposit_transaction_id'],
                    'status' => $result['status'],
                    'settled_at' => $result['status'] === 'settled' ? now() : null,
                ]);

                $newRefundedTotal = $line['already_refunded'] + $line['allocated'];

                if ($newRefundedTotal >= $payment->amount) {
                    $payment->update(['status' => 'refunded']);
                }
            }

            return $saleReturn->fresh(['items', 'refunds']);
        });
    }

    private function restockItem(SaleItem $saleItem, SaleReturnItem $returnItem, float $qtyBase, Sale $sale, string $reason): void
    {
        $remaining = $qtyBase;

        $consumptions = StockLayerConsumption::where('consumableable_type', SaleItem::class)
            ->where('consumableable_id', $saleItem->id)
            ->orderBy('id')
            ->get();

        $qtyBefore = $this->stockService->getAvailable($saleItem->product, $sale->outlet);

        foreach ($consumptions as $consumption) {
            if ($remaining <= 0) {
                break;
            }

            $available = (float) $consumption->qty - (float) $consumption->qty_returned;

            if ($available <= 0) {
                continue;
            }

            $take = min($available, $remaining);
            $this->stockService->returnToLayer($consumption, $take);
            $remaining -= $take;

            if ($returnItem->stock_layer_consumption_id === null) {
                $returnItem->update(['stock_layer_consumption_id' => $consumption->id]);
            }
        }

        if ($remaining > 1e-9) {
            throw new DomainException('Stok layer asal tidak cukup untuk menampung retur ini — kemungkinan data konsumsi tidak konsisten.');
        }

        $this->stockService->recordMovement(
            $saleItem->product,
            $sale->outlet,
            'sale_return',
            $qtyBase,
            $qtyBefore,
            $returnItem->unit_cost,
            $sale,
            "Retur: {$reason}",
        );
    }
}
