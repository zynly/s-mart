<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleHold extends Model
{
    protected $fillable = [
        'reference', 'outlet_id', 'cashier_session_id', 'user_id', 'member_id',
        'cart_data', 'item_count', 'total', 'held_at', 'note',
    ];

    protected function casts(): array
    {
        return [
            'cart_data' => 'array',
            'item_count' => 'integer',
            'total' => 'integer',
            'held_at' => 'datetime',
        ];
    }

    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    public function cashierSession(): BelongsTo
    {
        return $this->belongsTo(CashierSession::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
