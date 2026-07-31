<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockTransfer extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'reference', 'from_outlet_id', 'to_outlet_id', 'transfer_date', 'expected_arrival',
        'status', 'total_qty', 'total_value', 'created_by', 'approved_by',
        'sent_by', 'received_by', 'approved_at', 'sent_at', 'received_at', 'note',
    ];

    protected function casts(): array
    {
        return [
            'transfer_date' => 'date',
            'expected_arrival' => 'date',
            'total_qty' => 'decimal:3',
            'total_value' => 'integer',
            'approved_at' => 'datetime',
            'sent_at' => 'datetime',
            'received_at' => 'datetime',
        ];
    }

    public function fromOutlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class, 'from_outlet_id');
    }

    public function toOutlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class, 'to_outlet_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockTransferItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}
