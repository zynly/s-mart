<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class StockLayerConsumption extends Model
{
    protected $fillable = [
        'stock_layer_id', 'qty', 'unit_cost', 'total_cost',
        'consumableable_type', 'consumableable_id', 'is_returned',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:3',
            'unit_cost' => 'integer',
            'total_cost' => 'integer',
            'is_returned' => 'boolean',
        ];
    }

    public function stockLayer(): BelongsTo
    {
        return $this->belongsTo(StockLayer::class);
    }

    public function consumableable(): MorphTo
    {
        return $this->morphTo();
    }
}
