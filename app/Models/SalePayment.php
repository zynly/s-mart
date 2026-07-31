<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalePayment extends Model
{
    protected $fillable = [
        'sale_id', 'payment_method_id', 'amount', 'received_amount', 'change_amount',
        'cash_account_id', 'reference_no', 'mdr_percent', 'mdr_amount', 'net_amount',
        'deposit_transaction_id', 'coupon_id', 'point_used', 'status', 'settled_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'received_amount' => 'integer',
            'change_amount' => 'integer',
            'mdr_percent' => 'decimal:2',
            'mdr_amount' => 'integer',
            'net_amount' => 'integer',
            'point_used' => 'integer',
            'settled_at' => 'datetime',
        ];
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(CashAccount::class);
    }

    public function depositTransaction(): BelongsTo
    {
        return $this->belongsTo(DepositTransaction::class);
    }
}
