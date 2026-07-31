<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sale extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'reference', 'outlet_id', 'cashier_session_id', 'user_id', 'member_id',
        'member_card_id', 'payment_method_id', 'sale_date', 'type', 'subtotal',
        'item_discount', 'bill_discount', 'promo_discount', 'total_discount', 'tax',
        'rounding', 'grand_total', 'total_cost', 'gross_profit', 'paid_amount',
        'change_amount', 'status', 'void_reason', 'voided_by', 'voided_at',
        'price_changed_by', 'discount_approved_by', 'idempotency_key', 'note',
    ];

    protected function casts(): array
    {
        return [
            'sale_date' => 'datetime',
            'subtotal' => 'integer',
            'item_discount' => 'integer',
            'bill_discount' => 'integer',
            'promo_discount' => 'integer',
            'total_discount' => 'integer',
            'tax' => 'integer',
            'rounding' => 'integer',
            'grand_total' => 'integer',
            'total_cost' => 'integer',
            'gross_profit' => 'integer',
            'paid_amount' => 'integer',
            'change_amount' => 'integer',
            'voided_at' => 'datetime',
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

    public function memberCard(): BelongsTo
    {
        return $this->belongsTo(MemberCard::class);
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SalePayment::class);
    }

    public function receivable(): HasOne
    {
        return $this->hasOne(Receivable::class);
    }

    public function voider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }
}
