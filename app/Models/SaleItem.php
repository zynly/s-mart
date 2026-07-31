<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItem extends Model
{
    protected $fillable = [
        'sale_id', 'product_id', 'unit_id', 'qty', 'qty_base', 'original_price',
        'unit_price', 'discount_amount', 'discount_percent', 'promo_id',
        'promo_discount', 'subtotal', 'unit_cost', 'total_cost', 'is_free',
        'price_changed_by', 'note',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:3',
            'qty_base' => 'decimal:3',
            'original_price' => 'integer',
            'unit_price' => 'integer',
            'discount_amount' => 'integer',
            'discount_percent' => 'decimal:2',
            'promo_discount' => 'integer',
            'subtotal' => 'integer',
            'unit_cost' => 'integer',
            'total_cost' => 'integer',
            'is_free' => 'boolean',
        ];
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }
}
