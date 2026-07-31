<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTransferItem extends Model
{
    protected $fillable = [
        'stock_transfer_id', 'product_id', 'qty_sent', 'qty_received', 'unit_cost',
        'source_layer_id', 'destination_layer_id', 'batch_no', 'expired_at', 'note',
    ];

    protected function casts(): array
    {
        return [
            'qty_sent' => 'decimal:3',
            'qty_received' => 'decimal:3',
            'unit_cost' => 'integer',
            'expired_at' => 'date',
        ];
    }

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(StockTransfer::class, 'stock_transfer_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function sourceLayer(): BelongsTo
    {
        return $this->belongsTo(StockLayer::class, 'source_layer_id');
    }

    public function destinationLayer(): BelongsTo
    {
        return $this->belongsTo(StockLayer::class, 'destination_layer_id');
    }
}
