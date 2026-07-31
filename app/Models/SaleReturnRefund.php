<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleReturnRefund extends Model
{
    protected $fillable = [
        'sale_return_id', 'sale_payment_id', 'payment_method_id', 'target', 'amount',
        'point_refunded', 'deposit_transaction_id', 'cash_account_id', 'reference_no',
        'status', 'settled_at', 'confirmed_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'point_refunded' => 'integer',
            'settled_at' => 'datetime',
        ];
    }

    public function saleReturn(): BelongsTo
    {
        return $this->belongsTo(SaleReturn::class);
    }

    public function salePayment(): BelongsTo
    {
        return $this->belongsTo(SalePayment::class);
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function depositTransaction(): BelongsTo
    {
        return $this->belongsTo(DepositTransaction::class);
    }

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(CashAccount::class);
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
