<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class SaleReturn extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'reference', 'sale_id', 'outlet_id', 'cashier_session_id', 'origin_session_closed',
        'member_id', 'return_date', 'type', 'reason', 'reason_detail', 'subtotal', 'discount',
        'tax', 'total', 'total_cost', 'status', 'approved_by', 'approved_at', 'created_by',
        'idempotency_key', 'note',
    ];

    protected function casts(): array
    {
        return [
            'origin_session_closed' => 'boolean',
            'return_date' => 'datetime',
            'subtotal' => 'integer',
            'discount' => 'integer',
            'tax' => 'integer',
            'total' => 'integer',
            'total_cost' => 'integer',
            'approved_at' => 'datetime',
        ];
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    public function cashierSession(): BelongsTo
    {
        return $this->belongsTo(CashierSession::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleReturnItem::class);
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(SaleReturnRefund::class);
    }

    public function exchange(): HasOne
    {
        return $this->hasOne(Exchange::class);
    }
}
