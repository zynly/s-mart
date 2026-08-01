<?php

namespace App\Services;

use App\Exceptions\MissingExpiryDateException;
use App\Models\CashAccount;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchaseOtherCost;
use App\Models\PurchaseReturn;
use App\Models\PurchaseReturnItem;
use App\Models\StockLayer;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\UnitConversion;
use App\Models\User;
use App\Support\ReferenceGenerator;
use DomainException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PurchaseService
{
    public function __construct(
        private readonly StockService $stockService,
        private readonly DebtService $debtService,
        private readonly CashService $cashService,
    ) {}

    /**
     * @param  array<int, array{product_id: int, unit_id: int, qty_ordered: float, unit_price: int, discount?: int}>  $items
     */
    public function createOrder(array $data, array $items): PurchaseOrder
    {
        return DB::transaction(function () use ($data, $items) {
            $subtotal = array_sum(array_map(
                fn (array $item) => ($item['qty_ordered'] * $item['unit_price']) - ($item['discount'] ?? 0),
                $items,
            ));

            $order = PurchaseOrder::create([
                'reference' => ReferenceGenerator::generate('PO', $data['outlet_id']),
                'supplier_id' => $data['supplier_id'],
                'outlet_id' => $data['outlet_id'],
                'order_date' => $data['order_date'] ?? now()->toDateString(),
                'expected_date' => $data['expected_date'] ?? null,
                'status' => 'draft',
                'subtotal' => $subtotal,
                'discount' => $data['discount'] ?? 0,
                'tax' => $data['tax'] ?? 0,
                'total' => $subtotal - ($data['discount'] ?? 0) + ($data['tax'] ?? 0),
                'note' => $data['note'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($items as $item) {
                PurchaseOrderItem::create([
                    'purchase_order_id' => $order->id,
                    'product_id' => $item['product_id'],
                    'unit_id' => $item['unit_id'],
                    'qty_ordered' => $item['qty_ordered'],
                    'unit_price' => $item['unit_price'],
                    'discount' => $item['discount'] ?? 0,
                    'subtotal' => ($item['qty_ordered'] * $item['unit_price']) - ($item['discount'] ?? 0),
                ]);
            }

            return $order->fresh('items');
        });
    }

    public function approveOrder(PurchaseOrder $order, User $approver): PurchaseOrder
    {
        $order->update([
            'status' => 'approved',
            'approved_by' => $approver->id,
            'approved_at' => now(),
        ]);

        return $order;
    }

    /**
     * Penerimaan barang: buat Purchase + PurchaseItem + StockLayer +
     * StockMovement, dan Debt bila kredit (kecuali konsinyasi — ADR-0006:
     * tidak ada hutang usaha, tidak ada jurnal saat terima).
     *
     * @param  array<int, array{product_id: int, unit_id: int, qty: float, unit_price: int, discount?: int, batch_no?: string, expired_at?: string}>  $items
     * @param  array<int, array{name: string, amount: int, allocation?: string}>  $otherCosts
     */
    public function receive(array $data, array $items, array $otherCosts = []): Purchase
    {
        return DB::transaction(function () use ($data, $items, $otherCosts) {
            $supplier = Supplier::findOrFail($data['supplier_id']);
            $outlet = Outlet::findOrFail($data['outlet_id']);
            $isConsignment = ($data['type'] ?? 'regular') === 'consignment';

            $subtotal = array_sum(array_map(
                fn (array $item) => ($item['qty'] * $item['unit_price']) - ($item['discount'] ?? 0),
                $items,
            ));

            $otherCostTotal = array_sum(array_column($otherCosts, 'amount'));
            $discount = $data['discount'] ?? 0;
            $tax = $data['tax'] ?? 0;
            $total = $subtotal - $discount + $tax + $otherCostTotal;
            $paymentType = $isConsignment ? 'cash' : ($data['payment_type'] ?? 'cash');

            $purchase = Purchase::create([
                'reference' => ReferenceGenerator::generate('PB', $outlet->id),
                'purchase_order_id' => $data['purchase_order_id'] ?? null,
                'supplier_id' => $supplier->id,
                'outlet_id' => $outlet->id,
                'invoice_no' => $data['invoice_no'] ?? null,
                'purchase_date' => $data['purchase_date'] ?? now()->toDateString(),
                'due_date' => $data['due_date'] ?? null,
                'type' => $isConsignment ? 'consignment' : 'regular',
                'payment_type' => $paymentType,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'tax' => $tax,
                'other_cost' => $otherCostTotal,
                'total' => $total,
                'paid_amount' => $isConsignment ? 0 : ($paymentType === 'cash' ? $total : 0),
                'remaining_amount' => $isConsignment ? 0 : ($paymentType === 'credit' ? $total : 0),
                'status' => 'received',
                'note' => $data['note'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($otherCosts as $cost) {
                PurchaseOtherCost::create([
                    'purchase_id' => $purchase->id,
                    'name' => $cost['name'],
                    'amount' => $cost['amount'],
                    'allocation' => $cost['allocation'] ?? 'by_value',
                ]);
            }

            foreach ($items as $item) {
                $this->receiveItem($purchase, $outlet, $supplier, $item, $subtotal, $otherCostTotal, $isConsignment);
            }

            if (! $isConsignment && $paymentType === 'credit') {
                $this->debtService->createFromPurchase($purchase);
            }

            // Catatan (Fase 13, ditemukan saat membaca ulang bersamaan
            // dengan Temuan D): sisi pembelian TUNAI-nya sendiri juga tidak
            // pernah menyentuh CashService. Beda dengan retur (recordIn,
            // selalu berhasil), di sini recordOut() bisa gagal
            // (InsufficientCashBalanceException) karena cash_accounts.
            // current_balance SELALU disemai 0 dan tidak pernah didanai
            // otomatis (lihat Temuan C) — menyambungkannya di sini akan
            // memblokir alur pembelian tunai yang sudah berjalan sampai
            // pemilik toko menyetor kas manual dulu, perubahan perilaku
            // operasional yang di luar cakupan bug-fix retur yang disetujui.
            // Sengaja TIDAK diperbaiki di fase ini — didokumentasikan saja,
            // konsisten dengan keputusan Temuan C (GL jurnal & cash_accounts
            // tetap dua ledger terpisah untuk fase ini).

            return $purchase->fresh(['items', 'otherCosts']);
        });
    }

    /**
     * @param  array{product_id: int, unit_id: int, qty: float, unit_price: int, discount?: int, batch_no?: string, expired_at?: string}  $item
     */
    private function receiveItem(Purchase $purchase, Outlet $outlet, Supplier $supplier, array $item, float $purchaseSubtotal, int $otherCostTotal, bool $isConsignment): void
    {
        $product = Product::findOrFail($item['product_id']);
        $unit = Unit::findOrFail($item['unit_id']);
        $itemSubtotal = ($item['qty'] * $item['unit_price']) - ($item['discount'] ?? 0);

        $allocatedCost = $purchaseSubtotal > 0
            ? (int) round($otherCostTotal * ($itemSubtotal / $purchaseSubtotal))
            : 0;

        $qtyBase = $this->convertToBaseQty($product, $unit, (float) $item['qty']);
        $finalUnitCost = $qtyBase > 0 ? (int) round(($itemSubtotal + $allocatedCost) / $qtyBase) : 0;
        $expiredAt = isset($item['expired_at']) ? Carbon::parse($item['expired_at']) : null;

        if ($product->is_expirable && $expiredAt === null) {
            throw MissingExpiryDateException::make($product->name);
        }

        $qtyBefore = $this->stockService->getAvailable($product, $outlet);

        $layer = $this->stockService->addLayer(
            $product,
            $outlet,
            $qtyBase,
            $finalUnitCost,
            $item['batch_no'] ?? null,
            $expiredAt,
            $purchase,
            $isConsignment,
            $supplier->id,
        );

        PurchaseItem::create([
            'purchase_id' => $purchase->id,
            'product_id' => $product->id,
            'unit_id' => $unit->id,
            'qty' => $item['qty'],
            'qty_base' => $qtyBase,
            'unit_price' => $item['unit_price'],
            'discount' => $item['discount'] ?? 0,
            'subtotal' => $itemSubtotal,
            'allocated_cost' => $allocatedCost,
            'final_unit_cost' => $finalUnitCost,
            'batch_no' => $item['batch_no'] ?? null,
            'expired_at' => $expiredAt,
            'stock_layer_id' => $layer->id,
        ]);

        $this->stockService->recordMovement(
            $product,
            $outlet,
            $isConsignment ? 'consignment_in' : 'purchase',
            $qtyBase,
            $qtyBefore,
            $finalUnitCost,
            $purchase,
            null,
            $layer->id,
        );
    }

    /**
     * @param  array<int, array{purchase_item_id: int, qty: float, unit_cost: int}>  $items
     */
    public function processReturn(array $data, array $items): PurchaseReturn
    {
        return DB::transaction(function () use ($data, $items) {
            $purchase = Purchase::findOrFail($data['purchase_id']);
            $outlet = $purchase->outlet;

            $total = array_sum(array_map(fn (array $i) => $i['qty'] * $i['unit_cost'], $items));

            $return = PurchaseReturn::create([
                'reference' => ReferenceGenerator::generate('RB', $outlet->id),
                'purchase_id' => $purchase->id,
                'supplier_id' => $purchase->supplier_id,
                'outlet_id' => $outlet->id,
                'return_date' => $data['return_date'] ?? now()->toDateString(),
                'reason' => $data['reason'],
                'total' => $total,
                'status' => 'completed',
                'approved_by' => $data['approved_by'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($items as $item) {
                $purchaseItem = PurchaseItem::findOrFail($item['purchase_item_id']);
                $layer = StockLayer::findOrFail($purchaseItem->stock_layer_id);
                $product = $purchaseItem->product;

                $qtyBefore = $this->stockService->getAvailable($product, $outlet);
                $this->stockService->reduceLayer($layer, (float) $item['qty']);

                PurchaseReturnItem::create([
                    'purchase_return_id' => $return->id,
                    'purchase_item_id' => $purchaseItem->id,
                    'product_id' => $product->id,
                    'qty' => $item['qty'],
                    'unit_cost' => $item['unit_cost'],
                    'subtotal' => $item['qty'] * $item['unit_cost'],
                    'stock_layer_id' => $layer->id,
                ]);

                $this->stockService->recordMovement(
                    $product,
                    $outlet,
                    'purchase_return',
                    -$item['qty'],
                    $qtyBefore,
                    $item['unit_cost'],
                    $return,
                    null,
                    $layer->id,
                );
            }

            if ($purchase->payment_type === 'credit') {
                $debt = $purchase->debt()->first();

                if ($debt !== null) {
                    $this->debtService->reduceFromReturn($debt, $total);
                }
            } elseif ($total > 0) {
                // Bug nyata (Fase 13 §Temuan D): retur pembelian tunai
                // sebelumnya tidak pernah menyentuh kas sama sekali meski
                // CashService sudah ada sejak Fase 7 — supplier
                // mengembalikan uang tapi cash_accounts tidak pernah tahu.
                $cashAccount = CashAccount::where('outlet_id', $outlet->id)->where('is_default', true)->first()
                    ?? CashAccount::where('outlet_id', $outlet->id)->first();

                if ($cashAccount !== null) {
                    $this->cashService->recordIn($cashAccount, $total, null, "Retur pembelian tunai {$return->reference}", null, $return);
                }
            }

            return $return->fresh('items');
        });
    }

    private function convertToBaseQty(Product $product, Unit $unit, float $qty): float
    {
        if ($unit->id === $product->base_unit_id) {
            return $qty;
        }

        $conversion = UnitConversion::where('product_id', $product->id)
            ->where('from_unit_id', $unit->id)
            ->where('to_unit_id', $product->base_unit_id)
            ->first();

        if ($conversion === null) {
            throw new DomainException("Konversi satuan dari \"{$unit->name}\" ke satuan dasar produk \"{$product->name}\" belum diatur.");
        }

        return $qty * (float) $conversion->factor;
    }
}
