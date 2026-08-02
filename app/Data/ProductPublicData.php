<?php

namespace App\Data;

use Spatie\LaravelData\Data;

/**
 * T-111 (Fase 19). SATU-SATUNYA bentuk data produk yang boleh
 * dikirim ke storefront publik — lapisan keamanan eksplisit supaya
 * tidak mungkin tidak sengaja mengirim `unit_cost`/`avg_cost`/`hpp`/
 * `margin`/`supplier_id`/`batch_no`/`sku`/qty mentah ke React lewat
 * `$product->toArray()` biasa. Field APAPUN yang tidak ada di sini
 * TIDAK PERNAH sampai ke browser — JANGAN tambah field tanpa
 * mempertimbangkan apakah itu boleh publik (lihat catatan keamanan
 * di StorefrontService).
 *
 * SKU sengaja TIDAK disertakan (keputusan bisnis T-111: tidak
 * berguna untuk wali/santri sebagai pembeli, memudahkan kompetitor
 * memetakan katalog). Status konsinyasi juga sengaja tidak
 * disertakan (tidak relevan dari sisi pembeli).
 */
class ProductPublicData extends Data
{
    /**
     * @param  array<int, string>  $images  URL gambar saja (bukan model ProductImage)
     */
    public function __construct(
        public string $slug,
        public string $name,
        public ?string $description,
        public ?string $category,
        public ?string $brand,
        public int $price,
        public ?int $promoPrice,
        public ?string $promoLabel,
        public string $stockBadge,
        public array $images,
    ) {}
}
