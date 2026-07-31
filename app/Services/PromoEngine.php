<?php

namespace App\Services;

use App\Models\Member;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\Promo;
use App\Models\SaleItem;
use App\Models\Stock;
use App\Models\StockLayer;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Mesin diskon Fase 10. Urutan prioritas (CONTEXT.md / PROMPT §Fase 10)
 * bersifat tetap:
 *   Tahap 1 — level item, pilih SATU promo terbaik untuk pembeli:
 *     clearance > product > category > happy_hour > tiered_qty
 *     (urutan ini adalah default; `priority` eksplisit pada promo
 *     dapat menimpanya — lihat resolveStage1()).
 *   Tahap 2 — level item tambahan, BOLEH menumpuk di atas Tahap 1:
 *     bundle, buy_x_get_y.
 *   Tahap 3 — level nota, berurutan: diskon member level (otomatis
 *     dari MemberLevel::discount_percent) lalu voucher/kupon (lihat
 *     VoucherService, dipanggil terpisah oleh SaleService) lalu
 *     diskon manual kasir (bill_discount mentah, di luar engine ini).
 *
 * Batas mutlak: total diskon per item tidak boleh menembus HPP. Karena
 * biaya FEFO aktual baru diketahui setelah StockService::consume() saat
 * checkout, floor HPP di sini memakai `stocks.avg_cost` sebagai estimasi
 * — cukup akurat untuk pagar pengaman preview, bukan angka final.
 */
class PromoEngine
{
    private const STAGE1_TYPES = ['clearance', 'product', 'category', 'happy_hour', 'tiered_qty'];

    private const STAGE1_DEFAULT_ORDER = ['clearance', 'product', 'category', 'happy_hour', 'tiered_qty'];

    /**
     * @param  array<int, array{key:string, product: Product, qty: float, unit_price: int, subtotal: int}>  $lines
     * @return array{
     *     items: array<string, array{applied_promos: array<int,string>, discount: int}>,
     *     bill_discount: int,
     *     total_discount: int,
     *     warnings: array<int,string>,
     * }
     */
    public function applyToCart(array $lines, ?Member $member, Carbon $at, ?Outlet $outlet = null): array
    {
        $itemResults = [];
        $warnings = [];
        $totalItemDiscount = 0;

        foreach ($lines as $line) {
            $result = $this->applyToLine($line, $member, $at, $outlet);
            $itemResults[$line['key']] = $result;
            $totalItemDiscount += $result['discount'];

            foreach ($result['warnings'] as $w) {
                $warnings[] = $w;
            }
        }

        $subtotalAfterItemDiscount = array_sum(array_map(
            fn ($line) => $line['subtotal'] - ($itemResults[$line['key']]['discount'] ?? 0),
            $lines,
        ));

        $billDiscount = $this->applyMemberLevelDiscount($subtotalAfterItemDiscount, $member);

        return [
            'items' => $itemResults,
            'bill_discount' => $billDiscount,
            'total_discount' => $totalItemDiscount + $billDiscount,
            'warnings' => $warnings,
        ];
    }

    /**
     * @param  array{key:string, product: Product, qty: float, unit_price: int, subtotal: int}  $line
     * @return array{applied_promos: array<int,string>, discount: int, warnings: array<int,string>}
     */
    private function applyToLine(array $line, ?Member $member, Carbon $at, ?Outlet $outlet): array
    {
        $product = $line['product'];
        $appliedPromos = [];
        $warnings = [];
        $discount = 0;

        $floor = $this->hppFloor($product, $line['qty'], $outlet);
        $maxDiscount = max(0, $line['subtotal'] - $floor);

        $stage1 = $this->resolveStage1($product, $member, $at, $line);

        if ($stage1 !== null) {
            [$promo, $amount] = $stage1;
            $amount = min($amount, $maxDiscount);

            if ($amount < $this->rawDiscountAmount($promo, $line)) {
                $warnings[] = "Diskon \"{$promo->name}\" dipotong karena mendekati HPP.";
            }

            $discount += $amount;
            $appliedPromos[] = $promo->code;
        }

        foreach ($this->resolveStage2($product, $member, $at, $line) as [$promo, $rawAmount]) {
            $remainingRoom = max(0, $maxDiscount - $discount);
            $amount = min($rawAmount, $remainingRoom);

            if ($amount <= 0) {
                continue;
            }

            if ($amount < $rawAmount) {
                $warnings[] = "Diskon \"{$promo->name}\" dipotong karena mendekati HPP.";
            }

            $discount += $amount;
            $appliedPromos[] = $promo->code;
        }

        return ['applied_promos' => $appliedPromos, 'discount' => (int) round($discount), 'warnings' => $warnings];
    }

    /**
     * @param  array{key:string, product: Product, qty: float, unit_price: int, subtotal: int}  $line
     * @return array{0: Promo, 1: int}|null
     */
    private function resolveStage1(Product $product, ?Member $member, Carbon $at, array $line): ?array
    {
        $candidates = $this->getEligiblePromos($product, $member, $at, self::STAGE1_TYPES)
            ->filter(fn (Promo $p) => $this->matchesMinQty($p, $line['qty']));

        if ($candidates->isEmpty()) {
            return null;
        }

        // Promo is_stackable=false pada tahap 1 tidak relevan (hanya satu
        // yang dipilih di sini); urutan: priority eksplisit dulu, baru
        // urutan default jenis promo (clearance paling diutamakan).
        $best = $candidates
            ->sortByDesc(fn (Promo $p) => [
                $p->priority,
                -array_search($p->type, self::STAGE1_DEFAULT_ORDER, true),
            ])
            ->map(fn (Promo $p) => [$p, $this->rawDiscountAmount($p, $line)])
            ->sortByDesc(fn ($pair) => $pair[1])
            ->first();

        return $best;
    }

    /**
     * @param  array{key:string, product: Product, qty: float, unit_price: int, subtotal: int}  $line
     * @return array<int, array{0: Promo, 1: int}>
     */
    private function resolveStage2(Product $product, ?Member $member, Carbon $at, array $line): array
    {
        $results = [];

        foreach ($this->getEligiblePromos($product, $member, $at, ['buy_x_get_y']) as $promo) {
            if ($line['qty'] < (float) $promo->buy_qty) {
                continue;
            }

            $sets = intdiv((int) floor($line['qty'] / (float) $promo->buy_qty), 1);
            $freeQty = min($sets * (float) $promo->get_qty, $line['qty']);

            if ($promo->get_product_id === null || $promo->get_product_id === $product->id) {
                $results[] = [$promo, (int) round($freeQty * $line['unit_price'])];
            }
        }

        foreach ($this->getEligiblePromos($product, $member, $at, ['bundle']) as $promo) {
            // Interpretasi bundle disederhanakan: diskon berlaku bila qty
            // baris memenuhi ambang min_qty promo (kombinasi lintas-produk
            // penuh memerlukan konteks seluruh keranjang — di luar cakupan
            // per-baris method ini, lihat catatan verifikasi Fase 10).
            if ($promo->min_qty !== null && $line['qty'] < (float) $promo->min_qty) {
                continue;
            }

            $results[] = [$promo, $this->rawDiscountAmount($promo, $line)];
        }

        return $results;
    }

    private function applyMemberLevelDiscount(int $subtotalAfterItemDiscount, ?Member $member): int
    {
        if ($member === null) {
            return 0;
        }

        $percent = (float) ($member->level?->discount_percent ?? 0);

        if ($percent <= 0) {
            return 0;
        }

        return (int) round($subtotalAfterItemDiscount * $percent / 100);
    }

    /**
     * @param  array<string, mixed>  $types
     * @return Collection<int, Promo>
     */
    public function getEligiblePromos(Product $product, ?Member $member, Carbon $at, array $types): Collection
    {
        return Promo::query()
            ->where('is_active', true)
            ->whereIn('type', $types)
            ->where(fn ($q) => $q->whereNull('start_date')->orWhere('start_date', '<=', $at->toDateString()))
            ->where(fn ($q) => $q->whereNull('end_date')->orWhere('end_date', '>=', $at->toDateString()))
            ->with('products', 'categories')
            ->get()
            ->filter(fn (Promo $p) => $this->matchesProduct($p, $product))
            ->filter(fn (Promo $p) => $this->matchesTime($p, $at))
            ->filter(fn (Promo $p) => $this->checkQuota($p, $member));
    }

    private function matchesProduct(Promo $promo, Product $product): bool
    {
        return match ($promo->type) {
            'product', 'buy_x_get_y', 'bundle', 'tiered_qty' => $promo->products->isEmpty()
                ? true
                : $promo->products->contains('id', $product->id),
            'category' => $promo->categories->contains('id', $product->category_id),
            'clearance' => $this->isNearExpiry($product),
            'happy_hour' => $promo->products->isEmpty() || $promo->products->contains('id', $product->id),
            default => false,
        };
    }

    private function isNearExpiry(Product $product): bool
    {
        if (! $product->is_expirable) {
            return false;
        }

        $days = (int) config('pos.clearance_days', 7);

        return StockLayer::where('product_id', $product->id)
            ->where('qty_remaining', '>', 0)
            ->whereNotNull('expired_at')
            ->whereBetween('expired_at', [now()->toDateString(), now()->addDays($days)->toDateString()])
            ->exists();
    }

    private function matchesTime(Promo $promo, Carbon $at): bool
    {
        if ($promo->days_of_week !== null && ! in_array($at->dayOfWeekIso, $promo->days_of_week, true)) {
            return false;
        }

        if ($promo->type !== 'happy_hour') {
            return true;
        }

        if ($promo->start_time === null || $promo->end_time === null) {
            return true;
        }

        $current = $at->format('H:i:s');

        return $current >= $promo->start_time && $current <= $promo->end_time;
    }

    private function matchesMinQty(Promo $promo, float $qty): bool
    {
        if ($promo->type === 'tiered_qty') {
            return true; // divalidasi lewat tiers di rawDiscountAmount()
        }

        return $promo->min_qty === null || $qty >= (float) $promo->min_qty;
    }

    public function checkQuota(Promo $promo, ?Member $member): bool
    {
        if ($promo->quota_total !== null && $promo->used_count >= $promo->quota_total) {
            return false;
        }

        if ($promo->quota_per_member !== null && $member !== null) {
            $usedByMember = SaleItem::where('promo_id', $promo->id)
                ->whereHas('sale', fn ($q) => $q->where('member_id', $member->id)->where('status', 'completed'))
                ->count();

            if ($usedByMember >= $promo->quota_per_member) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array{qty: float, unit_price: int, subtotal: int}  $line
     */
    private function rawDiscountAmount(Promo $promo, array $line): int
    {
        if ($promo->type === 'tiered_qty') {
            return $this->tieredDiscountAmount($promo, $line);
        }

        return match ($promo->discount_type) {
            'percent' => min(
                (int) round($line['subtotal'] * $promo->discount_value / 100),
                $promo->max_discount ?? PHP_INT_MAX,
            ),
            'amount' => min($promo->discount_value, $line['subtotal']),
            'fixed_price' => max(0, $line['subtotal'] - $promo->discount_value),
            default => 0,
        };
    }

    /**
     * @param  array{qty: float, unit_price: int, subtotal: int}  $line
     */
    private function tieredDiscountAmount(Promo $promo, array $line): int
    {
        $tiers = collect($promo->tiers ?? [])->sortByDesc('min_qty');
        $tier = $tiers->first(fn ($t) => $line['qty'] >= (float) $t['min_qty']);

        if ($tier === null) {
            return 0;
        }

        return (int) round($line['subtotal'] * (float) $tier['discount'] / 100);
    }

    private function hppFloor(Product $product, float $qty, ?Outlet $outlet): int
    {
        $query = Stock::where('product_id', $product->id);

        if ($outlet !== null) {
            $query->where('outlet_id', $outlet->id);
        }

        $avgCost = (int) ($query->value('avg_cost') ?? 0);

        return (int) round($avgCost * $qty);
    }
}
