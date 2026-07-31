<?php

namespace App\Services;

use App\Models\Outlet;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\Unit;
use Carbon\Carbon;
use DateTimeInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PriceService
{
    /**
     * Harga aktif = effective_from terakhir yang <= hari ini dan
     * (effective_to null atau >= hari ini). Bukan "harga terbaru" secara
     * naif — bisa ada harga terjadwal di masa depan yang belum berlaku.
     *
     * $memberId disiapkan untuk member_price (Member model ada di Fase 3).
     */
    public function getActivePrice(Product $product, Outlet $outlet, Unit $unit, ?int $memberId = null): int
    {
        $today = now()->toDateString();

        $price = ProductPrice::query()
            ->where('product_id', $product->id)
            ->where('outlet_id', $outlet->id)
            ->where('unit_id', $unit->id)
            ->where('effective_from', '<=', $today)
            ->where(fn ($q) => $q->whereNull('effective_to')->orWhere('effective_to', '>=', $today))
            ->orderByDesc('effective_from')
            ->first();

        if ($price === null) {
            throw new RuntimeException("Harga aktif tidak ditemukan untuk produk {$product->sku} di outlet {$outlet->code}.");
        }

        return $memberId !== null && $price->member_price !== null
            ? $price->member_price
            : $price->price;
    }

    /**
     * Ganti harga = tutup baris lama (isi effective_to) + insert baris
     * baru. TIDAK ADA endpoint update pada product_prices (immutable).
     */
    public function changePrice(
        Product $product,
        Outlet $outlet,
        Unit $unit,
        int $newPrice,
        DateTimeInterface|string $from,
        ?int $newMemberPrice = null,
    ): ProductPrice {
        $fromDate = is_string($from) ? $from : $from->format('Y-m-d');

        return DB::transaction(function () use ($product, $outlet, $unit, $newPrice, $newMemberPrice, $fromDate) {
            $current = ProductPrice::query()
                ->where('product_id', $product->id)
                ->where('outlet_id', $outlet->id)
                ->where('unit_id', $unit->id)
                ->whereNull('effective_to')
                ->lockForUpdate()
                ->first();

            if ($current !== null) {
                $current->update(['effective_to' => Carbon::parse($fromDate)->subDay()->toDateString()]);
            }

            return ProductPrice::create([
                'product_id' => $product->id,
                'outlet_id' => $outlet->id,
                'unit_id' => $unit->id,
                'price' => $newPrice,
                'member_price' => $newMemberPrice,
                'effective_from' => $fromDate,
                'created_by' => Auth::id(),
            ]);
        });
    }
}
