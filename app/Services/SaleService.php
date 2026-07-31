<?php

namespace App\Services;

use App\Exceptions\MaxHoldExceededException;
use App\Models\CashierSession;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\Promo;
use App\Models\Sale;
use App\Models\SaleHold;
use App\Models\SaleItem;
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
        private readonly CashierSessionService $sessionService,
        private readonly PaymentService $paymentService,
        private readonly PromoEngine $promoEngine,
        private readonly VoucherService $voucherService,
        private readonly PointService $pointService,
        private readonly VoidService $voidService,
    ) {}

    /**
     * @param  array{outlet_id:int, cashier_session_id:int, member_id?:int, member_card_id?:int,
     *     bill_discount?:int, coupon_code?:string, idempotency_key:string,
     *     payments: array<int, array<string, mixed>>,
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
            $member = $memberId !== null ? Member::findOrFail($memberId) : null;

            $lines = [];
            $subtotal = 0;

            foreach ($cart['items'] as $index => $item) {
                $product = Product::findOrFail($item['product_id']);
                $unit = Unit::findOrFail($item['unit_id']);
                $activePrice = $this->priceService->getActivePrice($product, $outlet, $unit, $memberId);
                $unitPrice = $item['price_override'] ?? $activePrice;
                $qtyBase = $this->convertToBaseQty($product, $unit, (float) $item['qty']);
                $lineSubtotal = (int) round($unitPrice * (float) $item['qty']);

                $lines[] = [
                    'key' => (string) $index,
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

            $promoResult = $this->promoEngine->applyToCart(
                array_map(fn ($l) => ['key' => $l['key'], 'product' => $l['product'], 'qty' => $l['qty'], 'unit_price' => $l['unit_price'], 'subtotal' => $l['subtotal']], $lines),
                $member,
                now(),
                $outlet,
            );

            $itemDiscountTotal = (int) array_sum(array_column($promoResult['items'], 'discount'));
            $promoBillDiscount = (int) $promoResult['bill_discount'];
            $manualBillDiscount = $cart['bill_discount'] ?? 0;

            $couponDiscount = 0;
            $coupon = null;

            if (! empty($cart['coupon_code'])) {
                $couponCheck = $this->voucherService->validate(
                    $cart['coupon_code'],
                    array_map(fn ($l) => ['product_id' => $l['product']->id, 'subtotal' => $l['subtotal'] - ($promoResult['items'][$l['key']]['discount'] ?? 0)], $lines),
                    $member,
                );

                if (! $couponCheck['valid']) {
                    throw new DomainException($couponCheck['message'] ?? 'Kupon tidak valid.');
                }

                $coupon = $couponCheck['coupon'];
                $couponDiscount = $couponCheck['discount'];
            }

            $totalDiscount = $itemDiscountTotal + $promoBillDiscount + $couponDiscount + $manualBillDiscount;
            $maxDiscount = (int) round($subtotal * (int) config('pos.max_discount_percent', 50) / 100);

            if ($totalDiscount > $maxDiscount) {
                $promoResult['warnings'][] = "Total diskon dipotong ke batas maksimal {$maxDiscount}% dari subtotal.";
                $totalDiscount = $maxDiscount;
            }

            $grandTotal = max(0, $subtotal - $totalDiscount);

            $sale = Sale::create([
                'reference' => ReferenceGenerator::generate('INV', $outlet->id),
                'outlet_id' => $outlet->id,
                'cashier_session_id' => $session->id,
                'user_id' => auth()->id(),
                'member_id' => $memberId,
                'member_card_id' => $cart['member_card_id'] ?? null,
                'coupon_id' => $coupon?->id,
                // Nota split-payment tidak punya satu metode tunggal — kolom ini
                // hanya terisi untuk kemudahan tampilan bila persis satu metode
                // dipakai. Rincian lengkap selalu ada di sale_payments (T-055).
                'payment_method_id' => count($cart['payments']) === 1 ? $cart['payments'][0]['payment_method_id'] : null,
                'sale_date' => now(),
                'type' => 'regular',
                'subtotal' => $subtotal,
                'item_discount' => $itemDiscountTotal,
                'bill_discount' => $manualBillDiscount,
                'promo_discount' => $promoBillDiscount,
                'coupon_discount' => $couponDiscount,
                'total_discount' => $totalDiscount,
                'grand_total' => $grandTotal,
                'status' => 'completed',
                'idempotency_key' => $cart['idempotency_key'],
                'note' => $promoResult['warnings'] !== [] ? implode(' ', $promoResult['warnings']) : null,
            ]);

            $totalCost = 0;
            $appliedPromoIds = [];

            foreach ($lines as $line) {
                $itemPromo = $promoResult['items'][$line['key']];
                $firstPromoCode = $itemPromo['applied_promos'][0] ?? null;
                $firstPromo = $firstPromoCode !== null ? Promo::where('code', $firstPromoCode)->first() : null;

                if ($firstPromo !== null) {
                    $appliedPromoIds[] = $firstPromo->id;
                }

                $saleItem = SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $line['product']->id,
                    'unit_id' => $line['unit']->id,
                    'qty' => $line['qty'],
                    'qty_base' => $line['qty_base'],
                    'original_price' => $line['original_price'],
                    'unit_price' => $line['unit_price'],
                    'promo_id' => $firstPromo?->id,
                    'promo_discount' => $itemPromo['discount'],
                    'subtotal' => $line['subtotal'] - $itemPromo['discount'],
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

            foreach (array_unique($appliedPromoIds) as $promoId) {
                Promo::whereKey($promoId)->increment('used_count');
            }

            if ($coupon !== null) {
                $this->voucherService->redeem($coupon, $sale, $member, $couponDiscount);
            }

            $pointsEarned = $member !== null ? $this->pointService->earn($member, $grandTotal, $sale) : 0;

            $grossProfit = $grandTotal - $totalCost;
            $payments = $this->paymentService->process($sale, $cart['payments'], $member, $session, $outlet);
            $this->sessionService->recordSaleCompleted($session);

            $paidAmount = (int) $payments->sum(fn ($p) => $p->received_amount ?? $p->amount);
            $changeAmount = (int) $payments->sum('change_amount');

            $sale->update([
                'total_cost' => $totalCost,
                'gross_profit' => $grossProfit,
                'points_earned' => $pointsEarned,
                'paid_amount' => $paidAmount,
                'change_amount' => $changeAmount,
            ]);

            return $sale->fresh(['items.product', 'member', 'paymentMethod', 'payments.paymentMethod', 'coupon']);
        });
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

    /**
     * Delegasi ke VoidService (Fase 11 / T-070) — dipertahankan di sini
     * supaya pemanggil lama (SaleController, dst.) tidak perlu berubah.
     */
    public function void(Sale $sale, string $reason, ?User $approver = null): Sale
    {
        return $this->voidService->void($sale, $reason, $approver);
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
