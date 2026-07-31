<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseItem extends Model
{
    protected $fillable = [
        'purchase_id', 'product_id', 'unit_id', 'qty', 'qty_base', 'unit_price',
        'discount', 'subtotal', 'allocated_cost', 'final_unit_cost', 'batch_no',
        'expired_at', 'stock_layer_id',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:3',
            'qty_base' => 'decimal:3',
            'unit_price' => 'integer',
            'discount' => 'integer',
            'subtotal' => 'integer',
            'allocated_cost' => 'integer',
            'final_unit_cost' => 'integer',
            'expired_at' => 'date',
        ];
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function stockLayer(): BelongsTo
    {
        return $this->belongsTo(StockLayer::class);
    }
}
