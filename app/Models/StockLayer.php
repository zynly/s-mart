<?php

namespace App\Models;

use App\Traits\BelongsToOutlet;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class StockLayer extends Model
{
    use BelongsToOutlet;

    protected $fillable = [
        'product_id', 'outlet_id', 'qty_in', 'qty_remaining', 'unit_cost',
        'batch_no', 'expired_at', 'received_at', 'sourceable_type',
        'sourceable_id', 'is_consignment', 'supplier_id',
    ];

    protected function casts(): array
    {
        return [
            'qty_in' => 'decimal:3',
            'qty_remaining' => 'decimal:3',
            'unit_cost' => 'integer',
            'expired_at' => 'date',
            'received_at' => 'datetime',
            'is_consignment' => 'boolean',
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

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function consumptions(): HasMany
    {
        return $this->hasMany(StockLayerConsumption::class);
    }

    public function sourceable(): MorphTo
    {
        return $this->morphTo();
    }
}
