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
use Illuminate\Support\Collection;
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
        private readonly AuthorizationService $authorizationService,
        private readonly MemberLimitService $memberLimitService,
    ) {}

    /**
     * @param  array{outlet_id:int, cashier_session_id:int, member_id?:int, member_card_id?:int,
     *     bill_discount?:int, coupon_code?:string, idempotency_key:string,
     *     price_override_approval_token?:string, discount_approval_token?:string,
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

            // Temuan audit keamanan (Phase B): sebelumnya cashier_session_id
            // & outlet_id cuma divalidasi exists:... — kasir A bisa
            // memasukkan penjualan ke sesi kasir B (uang di laci A, selisih
            // muncul di laporan tutup sesi B), dan outlet_id sembarang bisa
            // memotong stok outlet lain dari terminal yang tidak berhak.
            // Sesi HARUS milik aktor yang login, dan outlet SELALU diambil
            // dari sesi (bukan dari input klien) — outlet_id di $cart tidak
            // lagi dipakai untuk apa pun yang berpengaruh ke data.
            if ($session->user_id !== auth()->id()) {
                throw new DomainException('Sesi kasir ini bukan milik Anda — tidak bisa memproses transaksi di sesi kasir lain.');
            }

            $outlet = Outlet::findOrFail($session->outlet_id);
            $memberId = $cart['member_id'] ?? null;
            $member = $memberId !== null ? Member::findOrFail($memberId) : null;

            // Audit Fase 5 (Temuan Kritis: MemberLimitService::canPurchase()
            // sebelumnya dead code — status suspend, jadwal, dan kategori
            // terblokir tersimpan di skema & tervalidasi di form admin,
            // tapi TIDAK PERNAH ditegakkan di titik transaksi manapun).
            // Cek status/jadwal SEKALI di sini (gagal cepat sebelum kerja
            // apa pun); cek kategori per-baris di bawah (produk beda-beda
            // kategori dalam satu keranjang).
            if ($member !== null) {
                $check = $this->memberLimitService->canPurchase($member);

                if (! $check['allowed']) {
                    throw new DomainException($check['reason'] ?? 'Anggota tidak diizinkan bertransaksi saat ini.');
                }
            }

            // Temuan audit performa (Phase C, CRITICAL): sebelumnya
            // Product::findOrFail()/Unit::findOrFail()/UnitConversion
            // query per BARIS keranjang (3 query/baris di luar harga) —
            // keranjang 10 item = 30+ query cuma untuk resolusi
            // produk/satuan. Batch sekali di sini, bukan per-iterasi.
            // PriceService::getActivePrice() TIDAK ikut di-batch (dipakai
            // luas di banyak service lain, batching-nya perlu perubahan
            // API bersama yang di luar skop perbaikan checkout ini —
            // dicatat sebagai lanjutan Phase C di INDEX.md).
            $productIds = array_values(array_unique(array_column($cart['items'], 'product_id')));
            $unitIds = array_values(array_unique(array_column($cart['items'], 'unit_id')));
            // Audit Fase 5: eager-load category (bukan lazy per-baris) —
            // sekarang dibaca tiap baris utk cek kategori terblokir member,
            // konsisten dgn disiplin batch-query yang sudah ada di sini.
            $products = Product::with('category')->findOrFail($productIds)->keyBy('id');
            $units = Unit::findOrFail($unitIds)->keyBy('id');

            $itemsNeedingConversion = array_filter(
                $cart['items'],
                fn (array $item) => (int) $item['unit_id'] !== $products[$item['product_id']]->base_unit_id,
            );
            $conversionUnitIds = array_values(array_unique(array_map(
                fn (array $item) => (int) $item['unit_id'],
                $itemsNeedingConversion,
            )));
            $conversions = $conversionUnitIds === []
                ? collect()
                : UnitConversion::whereIn('product_id', $productIds)
                    ->whereIn('from_unit_id', $conversionUnitIds)
                    ->get()
                    ->keyBy(fn (UnitConversion $c) => "{$c->product_id}:{$c->from_unit_id}:{$c->to_unit_id}");

            $lines = [];
            $subtotal = 0;

            foreach ($cart['items'] as $index => $item) {
                $product = $products[$item['product_id']];
                $unit = $units[$item['unit_id']];

                if ($member !== null && $product->category_id !== null) {
                    $categoryCheck = $this->memberLimitService->canPurchase($member, $product->category);

                    if (! $categoryCheck['allowed']) {
                        throw new DomainException($categoryCheck['reason'] ?? "Produk \"{$product->name}\" tidak diizinkan untuk anggota ini.");
                    }
                }

                $activePrice = $this->priceService->getActivePrice($product, $outlet, $unit, $memberId);
                $unitPrice = $item['price_override'] ?? $activePrice;

                if ($unitPrice <= 0) {
                    throw new DomainException("Produk \"{$product->name}\" belum memiliki harga yang valid dan tidak dapat dijual.");
                }

                $qtyBase = $this->convertToBaseQty($product, $unit, (float) $item['qty'], $conversions);
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

            // Temuan audit keamanan: harga manual di POS TIDAK dikirim UI
            // kasir mana pun saat ini (satu-satunya jalur field ini terisi
            // adalah request yang dirakit manual) — tanpa cek ini, harga
            // bisa ditimpa bebas (termasuk ke 0) tanpa otorisasi apa pun.
            $priceApprover = null;
            $hasPriceOverride = count(array_filter($lines, fn ($l) => $l['price_changed'])) > 0;

            if ($hasPriceOverride) {
                $priceApprover = $this->authorizationService->consumeToken($cart['price_override_approval_token'] ?? null, 'sale.change_price');

                if ($priceApprover === null) {
                    throw new DomainException('Ubah harga wajib otorisasi supervisor (permission sale.change_price).');
                }
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

            // Temuan audit keamanan: sebelumnya diskon di atas batas
            // di-CLAMP diam-diam (bukan ditolak) — SUM(sale_items.subtotal)
            // jadi tidak sama dengan grand_total karena diskon per item
            // (promo) tetap pakai nilai asli sementara total dipotong.
            // Sekarang wajib otorisasi eksplisit, dan kalau tidak ada,
            // TOLAK transaksi (bukan diam-diam dipotong).
            $discountApprover = null;

            if ($totalDiscount > $maxDiscount) {
                $discountApprover = $this->authorizationService->consumeToken($cart['discount_approval_token'] ?? null, 'sale.discount_over_limit');

                if ($discountApprover === null) {
                    throw new DomainException("Total diskon melebihi batas maksimal {$maxDiscount} (dari subtotal) — wajib otorisasi supervisor (permission sale.discount_over_limit).");
                }
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
                'discount_approved_by' => $discountApprover?->id,
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
                    'price_changed_by' => $line['price_changed'] ? $priceApprover?->id : null,
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

            // Audit Fase 6 (Temuan Sedang): PromoEngine::checkQuota() dibaca
            // TANPA lock sebelum keputusan "boleh pakai promo ini" diambil
            // di applyToCart() — di bawah concurrency tinggi, used_count
            // bisa melebihi quota_total walau counternya sendiri atomik
            // (keputusannya sudah basi, bukan angkanya yang salah). UPDATE
            // bersyarat ini memastikan used_count TIDAK PERNAH melebihi
            // quota_total, atomik di level SQL — kalau race kalah tepat
            // saat commit, counter cukup berhenti di batas (diskon yang
            // sudah dipakai nota ini tetap sah, harga sudah final ke
            // pelanggan; tidak masuk akal me-rollback nota karena ini).
            foreach (array_unique($appliedPromoIds) as $promoId) {
                Promo::whereKey($promoId)
                    ->where(fn ($q) => $q->whereNull('quota_total')->orWhereColumn('used_count', '<', 'quota_total'))
                    ->increment('used_count');
            }

            if ($coupon !== null) {
                $this->voucherService->redeem($coupon, $sale, $member, $couponDiscount);
            }

            $pointsEarned = $member !== null ? $this->pointService->earn($member, $grandTotal, $sale) : 0;

            // Rekonsiliasi otomatis pembayaran bila grand_total disesuaikan oleh PromoEngine
            // agar promo otomatis tidak menyebabkan PaymentMismatchException
            $cartPayments = $cart['payments'];
            $totalPaymentAmount = (int) array_sum(array_column($cartPayments, 'amount'));

            if ($totalPaymentAmount !== $grandTotal && ! empty($cartPayments)) {
                if (count($cartPayments) === 1) {
                    if (! isset($cartPayments[0]['received_amount'])) {
                        $cartPayments[0]['received_amount'] = $cartPayments[0]['amount'];
                    }
                    $cartPayments[0]['amount'] = $grandTotal;
                } else {
                    $diff = $totalPaymentAmount - $grandTotal;
                    if ($diff > 0) {
                        $cashIndex = null;
                        foreach ($cartPayments as $idx => $p) {
                            $pm = PaymentMethod::find($p['payment_method_id']);
                            if ($pm && $pm->type === 'cash') {
                                $cashIndex = $idx;
                                break;
                            }
                        }

                        if ($cashIndex !== null) {
                            if (! isset($cartPayments[$cashIndex]['received_amount'])) {
                                $cartPayments[$cashIndex]['received_amount'] = $cartPayments[$cashIndex]['amount'];
                            }
                            $cartPayments[$cashIndex]['amount'] = max(0, $cartPayments[$cashIndex]['amount'] - $diff);
                        } else {
                            $lastIdx = count($cartPayments) - 1;
                            $cartPayments[$lastIdx]['amount'] = max(0, $cartPayments[$lastIdx]['amount'] - $diff);
                        }
                    }
                }
            }

            $grossProfit = $grandTotal - $totalCost;
            $payments = $this->paymentService->process($sale, $cartPayments, $member, $session, $outlet);
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
        $session = CashierSession::findOrFail($cart['cashier_session_id']);

        // Temuan audit keamanan (Phase B) — pola sama seperti complete():
        // sesi harus milik aktor yang login, outlet diambil dari sesi.
        if ($session->user_id !== auth()->id()) {
            throw new DomainException('Sesi kasir ini bukan milik Anda — tidak bisa menahan transaksi di sesi kasir lain.');
        }

        // Audit Fase 7 (Temuan Rendah): count()-lalu-create() sebelumnya
        // TOCTOU — double-click/multi-tab cepat bisa melewati max_hold_per_cashier.
        // Dampaknya ringan (cuma batas lunak UI, bukan uang/stok), tapi
        // murah ditutup dengan lock sesi yang sama yang dipakai luas di
        // service lain.
        return DB::transaction(function () use ($cart, $session) {
            CashierSession::lockForUpdate()->findOrFail($session->id);

            $maxHold = (int) config('pos.max_hold_per_cashier', 5);
            $activeHolds = SaleHold::where('cashier_session_id', $session->id)->count();

            if ($activeHolds >= $maxHold) {
                throw MaxHoldExceededException::make($maxHold);
            }

            $total = array_sum(array_map(fn (array $i) => (float) $i['qty'] * (int) ($i['unit_price'] ?? 0), $cart['items']));

            return SaleHold::create([
                'reference' => ReferenceGenerator::generate('HOLD', $session->outlet_id),
                'outlet_id' => $session->outlet_id,
                'cashier_session_id' => $session->id,
                'user_id' => auth()->id(),
                'member_id' => $cart['member_id'] ?? null,
                'cart_data' => $cart,
                'item_count' => count($cart['items']),
                'total' => (int) round($total),
                'held_at' => now(),
            ]);
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function recall(SaleHold $hold, User $actor): array
    {
        // Temuan audit keamanan (Phase B): sebelumnya siapa pun ber-
        // sale.create bisa recall (dan menghapus permanen) hold kasir
        // lain hanya dengan menebak ID berurutan. Pemilik hold ATAU
        // pemegang pos.approve (supervisor/admin/owner, mis. serah
        // terima shift) boleh mengambilnya.
        if ($hold->user_id !== $actor->id && ! $actor->can('pos.approve')) {
            throw new DomainException('Hold ini milik kasir lain — tidak bisa diambil tanpa otorisasi supervisor.');
        }

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

    /**
     * @param  Collection<string, UnitConversion>|null  $prefetched  Hasil batch-load
     *                                                               dari complete() — kalau null, query langsung (dipakai pemanggil lain/standalone).
     */
    private function convertToBaseQty(Product $product, Unit $unit, float $qty, ?Collection $prefetched = null): float
    {
        if ($unit->id === $product->base_unit_id) {
            return $qty;
        }

        $key = "{$product->id}:{$unit->id}:{$product->base_unit_id}";

        $conversion = $prefetched !== null
            ? $prefetched->get($key)
            : UnitConversion::where('product_id', $product->id)
                ->where('from_unit_id', $unit->id)
                ->where('to_unit_id', $product->base_unit_id)
                ->first();

        if ($conversion === null) {
            throw new DomainException("Konversi satuan dari \"{$unit->name}\" ke satuan dasar produk \"{$product->name}\" belum diatur.");
        }

        return $qty * (float) $conversion->factor;
    }
}
