<?php

namespace App\Services;

use App\Exceptions\MaxHoldExceededException;
use App\Models\CashierSession;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleHold;
use App\Models\SaleItem;
use App\Models\StockLayerConsumption;
use App\Models\Unit;
use App\Models\UnitConversion;
use App\Models\User;
use App\Support\ReferenceGenerator;
use DomainException;
use Illuminate\Support\Facades\DB;

class SaleService
{
    public function __construct(
        private readonly StockService $stockService,
        private readonly PriceService $priceService,
        private readonly DepositService $depositService,
        private readonly CashierSessionService $sessionService,
    ) {}

    /**
     * Fase 8: pembayaran satu-metode sederhana (tunai/deposit). Split
     * payment multi-metode, QRIS, kredit, dst menyusul PaymentService
     * di Fase 9 — struktur $cart['items']/idempotency_key sudah
     * dirancang supaya PaymentService bisa menggantikan langkah
     * pembayaran ini tanpa mengubah langkah 1-4/6/8.
     *
     * @param  array{outlet_id:int, cashier_session_id:int, member_id?:int, member_card_id?:int,
     *     payment_method_id:int, paid_amount?:int, bill_discount?:int, idempotency_key:string,
     *     items: array<int, array{product_id:int, unit_id:int, qty:float, price_override?:int}>}  $cart
     */
    public function complete(array $cart): Sale
    {
        return DB::transaction(function () use ($cart) {
            $existing = Sale::where('idempotency_key', $cart['idempotency_key'])->first();

            if ($existing !== null) {
                return $existing;
            }

            $session = CashierSession::lockForUpdate()->findOrFail($cart['cashier_session_id']);

            if ($session->status !== 'open') {
                throw new DomainException('Sesi kasir tidak aktif — tidak bisa memproses transaksi.');
            }

            $outlet = Outlet::findOrFail($cart['outlet_id']);
            $memberId = $cart['member_id'] ?? null;

            $lines = [];
            $subtotal = 0;

            foreach ($cart['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);
                $unit = Unit::findOrFail($item['unit_id']);
                $activePrice = $this->priceService->getActivePrice($product, $outlet, $unit, $memberId);
                $unitPrice = $item['price_override'] ?? $activePrice;
                $qtyBase = $this->convertToBaseQty($product, $unit, (float) $item['qty']);
                $lineSubtotal = (int) round($unitPrice * (float) $item['qty']);

                $lines[] = [
                    'product' => $product,
                    'unit' => $unit,
                    'qty' => (float) $item['qty'],
                    'qty_base' => $qtyBase,
                    'original_price' => $activePrice,
                    'unit_price' => $unitPrice,
                    'subtotal' => $lineSubtotal,
                    'price_changed' => $unitPrice !== $activePrice,
                ];
                $subtotal += $lineSubtotal;
            }

            $billDiscount = $cart['bill_discount'] ?? 0;
            $grandTotal = max(0, $subtotal - $billDiscount);

            $sale = Sale::create([
                'reference' => ReferenceGenerator::generate('INV', $outlet->id),
                'outlet_id' => $outlet->id,
                'cashier_session_id' => $session->id,
                'user_id' => auth()->id(),
                'member_id' => $memberId,
                'member_card_id' => $cart['member_card_id'] ?? null,
                'payment_method_id' => $cart['payment_method_id'],
                'sale_date' => now(),
                'type' => 'regular',
                'subtotal' => $subtotal,
                'bill_discount' => $billDiscount,
                'total_discount' => $billDiscount,
                'grand_total' => $grandTotal,
                'status' => 'completed',
                'idempotency_key' => $cart['idempotency_key'],
            ]);

            $totalCost = 0;

            foreach ($lines as $line) {
                $saleItem = SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $line['product']->id,
                    'unit_id' => $line['unit']->id,
                    'qty' => $line['qty'],
                    'qty_base' => $line['qty_base'],
                    'original_price' => $line['original_price'],
                    'unit_price' => $line['unit_price'],
                    'subtotal' => $line['subtotal'],
                    'price_changed_by' => $line['price_changed'] ? auth()->id() : null,
                ]);

                $qtyBefore = $this->stockService->getAvailable($line['product'], $outlet);
                $consumeResult = $this->stockService->consume($line['product'], $outlet, $line['qty_base'], $saleItem);
                $lineCost = $consumeResult['total_cost'];
                $totalCost += $lineCost;

                $saleItem->update([
                    'unit_cost' => $line['qty_base'] > 0 ? (int) round($lineCost / $line['qty_base']) : 0,
                    'total_cost' => $lineCost,
                ]);

                $this->stockService->recordMovement(
                    $line['product'],
                    $outlet,
                    'sale',
                    -$line['qty_base'],
                    $qtyBefore,
                    $saleItem->unit_cost,
                    $sale,
                    null,
                    null,
                );
            }

            $grossProfit = $grandTotal - $totalCost;
            [$paidAmount, $changeAmount] = $this->processPayment($sale, $session, $outlet, $cart, $grandTotal, $memberId);

            $sale->update([
                'total_cost' => $totalCost,
                'gross_profit' => $grossProfit,
                'paid_amount' => $paidAmount,
                'change_amount' => $changeAmount,
            ]);

            return $sale->fresh(['items.product', 'member', 'paymentMethod']);
        });
    }

    /**
     * @return array{0: int, 1: int} [paid_amount, change_amount]
     */
    private function processPayment(Sale $sale, CashierSession $session, Outlet $outlet, array $cart, int $grandTotal, ?int $memberId): array
    {
        $paymentMethod = PaymentMethod::findOrFail($cart['payment_method_id']);

        if ($paymentMethod->type === 'deposit') {
            if ($memberId === null) {
                throw new DomainException('Metode Saldo Deposit membutuhkan anggota yang terpilih.');
            }

            $member = Member::findOrFail($memberId);
            $this->depositService->charge($member, $grandTotal, $sale, "{$cart['idempotency_key']}-deposit", $outlet->id, $session->id);
            $this->sessionService->addSaleDeposit($session, $grandTotal);

            return [$grandTotal, 0];
        }

        if ($paymentMethod->type === 'cash') {
            $paidAmount = $cart['paid_amount'] ?? $grandTotal;
            $changeAmount = max(0, $paidAmount - $grandTotal);
            $this->sessionService->addSaleCash($session, $grandTotal);

            return [$paidAmount, $changeAmount];
        }

        throw new DomainException("Metode bayar \"{$paymentMethod->name}\" belum didukung — split payment/QRIS/kredit menyusul Fase 9.");
    }

    /**
     * @param  array{outlet_id:int, cashier_session_id:int, member_id?:int, items: array<int, array<string, mixed>>}  $cart
     */
    public function hold(array $cart): SaleHold
    {
        $maxHold = (int) config('pos.max_hold_per_cashier', 5);
        $activeHolds = SaleHold::where('cashier_session_id', $cart['cashier_session_id'])->count();

        if ($activeHolds >= $maxHold) {
            throw MaxHoldExceededException::make($maxHold);
        }

        $total = array_sum(array_map(fn (array $i) => (float) $i['qty'] * (int) ($i['unit_price'] ?? 0), $cart['items']));

        return SaleHold::create([
            'reference' => ReferenceGenerator::generate('HOLD', $cart['outlet_id']),
            'outlet_id' => $cart['outlet_id'],
            'cashier_session_id' => $cart['cashier_session_id'],
            'user_id' => auth()->id(),
            'member_id' => $cart['member_id'] ?? null,
            'cart_data' => $cart,
            'item_count' => count($cart['items']),
            'total' => (int) round($total),
            'held_at' => now(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function recall(SaleHold $hold): array
    {
        $cart = $hold->cart_data;
        $hold->delete();

        return $cart;
    }

    public function void(Sale $sale, string $reason, ?User $approver = null): Sale
    {
        return DB::transaction(function () use ($sale, $reason, $approver) {
            $locked = Sale::lockForUpdate()->findOrFail($sale->id);

            if ($locked->status !== 'completed') {
                throw new DomainException('Hanya nota berstatus selesai yang bisa dibatalkan.');
            }

            $session = CashierSession::findOrFail($locked->cashier_session_id);

            if ($session->status !== 'open') {
                throw new DomainException('Sesi kasir nota ini sudah tutup — void tidak diperbolehkan (gunakan retur).');
            }

            foreach ($locked->items as $item) {
                $consumptions = StockLayerConsumption::where('consumableable_type', SaleItem::class)
                    ->where('consumableable_id', $item->id)
                    ->where('is_returned', false)
                    ->get();

                foreach ($consumptions as $consumption) {
                    $this->stockService->returnToLayer($consumption, (float) $consumption->qty);
                }

                $qtyBefore = $this->stockService->getAvailable($item->product, $locked->outlet);
                $this->stockService->recordMovement(
                    $item->product,
                    $locked->outlet,
                    'sale_return',
                    (float) $item->qty_base,
                    $qtyBefore,
                    $item->unit_cost,
                    $locked,
                    "Void: {$reason}",
                );
            }

            $paymentMethod = $locked->paymentMethod;

            if ($paymentMethod?->type === 'deposit' && $locked->member_id) {
                $member = Member::findOrFail($locked->member_id);
                $this->depositService->refund($member, $locked->grand_total, $locked, "{$locked->idempotency_key}-void");
                $session->decrement('total_sales_deposit', $locked->grand_total);
            } elseif ($paymentMethod?->type === 'cash') {
                $session->decrement('total_sales_cash', $locked->grand_total);
            }

            $this->sessionService->addVoid($session);

            $locked->update([
                'status' => 'void',
                'void_reason' => $reason,
                'voided_by' => $approver?->id,
                'voided_at' => now(),
            ]);

            return $locked;
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
