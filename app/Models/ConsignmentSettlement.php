<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConsignmentSettlement extends Model
{
    protected $fillable = [
        'reference', 'supplier_id', 'outlet_id', 'period_start', 'period_end',
        'total_sold', 'commission_percent', 'commission_amount', 'payable_amount',
        'status', 'paid_at', 'cash_account_id', 'created_by', 'approved_by',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'total_sold' => 'integer',
            'commission_percent' => 'decimal:2',
            'commission_amount' => 'integer',
            'payable_amount' => 'integer',
            'paid_at' => 'datetime',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ConsignmentSettlementItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
