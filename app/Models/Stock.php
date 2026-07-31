<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Stock extends Model
{
    protected $fillable = [
        'product_id', 'outlet_id', 'qty', 'reserved_qty', 'avg_cost',
        'last_cost', 'last_movement_at',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:3',
            'reserved_qty' => 'decimal:3',
            'avg_cost' => 'integer',
            'last_cost' => 'integer',
            'last_movement_at' => 'datetime',
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
}
