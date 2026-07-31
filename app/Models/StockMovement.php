<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class StockMovement extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'reference', 'product_id', 'outlet_id', 'type', 'qty', 'qty_before',
        'qty_after', 'unit_cost', 'total_cost', 'stock_layer_id',
        'sourceable_type', 'sourceable_id', 'user_id', 'note',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:3',
            'qty_before' => 'decimal:3',
            'qty_after' => 'decimal:3',
            'unit_cost' => 'integer',
            'total_cost' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    public function stockLayer(): BelongsTo
    {
        return $this->belongsTo(StockLayer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sourceable(): MorphTo
    {
        return $this->morphTo();
    }
}
