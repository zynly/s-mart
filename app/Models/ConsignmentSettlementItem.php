<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConsignmentSettlementItem extends Model
{
    protected $fillable = [
        'consignment_settlement_id', 'product_id', 'qty_sold', 'unit_price',
        'total_price', 'commission', 'payable',
    ];

    protected function casts(): array
    {
        return [
            'qty_sold' => 'decimal:3',
            'unit_price' => 'integer',
            'total_price' => 'integer',
            'commission' => 'integer',
            'payable' => 'integer',
        ];
    }

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(ConsignmentSettlement::class, 'consignment_settlement_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
