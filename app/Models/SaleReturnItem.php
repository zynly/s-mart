<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleReturnItem extends Model
{
    protected $fillable = [
        'sale_return_id', 'sale_item_id', 'product_id', 'unit_id', 'qty', 'qty_base',
        'unit_price', 'subtotal', 'unit_cost', 'total_cost', 'stock_layer_consumption_id',
        'condition', 'restock', 'stock_write_off_id',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:3',
            'qty_base' => 'decimal:3',
            'unit_price' => 'integer',
            'subtotal' => 'integer',
            'unit_cost' => 'integer',
            'total_cost' => 'integer',
            'restock' => 'boolean',
        ];
    }

    public function saleReturn(): BelongsTo
    {
        return $this->belongsTo(SaleReturn::class);
    }

    public function saleItem(): BelongsTo
    {
        return $this->belongsTo(SaleItem::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function stockLayerConsumption(): BelongsTo
    {
        return $this->belongsTo(StockLayerConsumption::class);
    }

    public function stockWriteOff(): BelongsTo
    {
        return $this->belongsTo(StockWriteOff::class);
    }
}
