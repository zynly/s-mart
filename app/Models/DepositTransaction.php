<?php

namespace App\Models;

use App\Traits\BelongsToOutlet;
use App\Traits\LogsActivityCustom;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class DepositTransaction extends Model
{
    use BelongsToOutlet, LogsActivityCustom;

    const UPDATED_AT = null;

    protected $fillable = [
        'reference', 'member_id', 'member_card_id', 'outlet_id', 'type', 'amount',
        'balance_before', 'balance_after', 'sourceable_type', 'sourceable_id',
        'payment_method_id', 'cash_account_id', 'cashier_session_id', 'user_id',
        'approved_by', 'idempotency_key', 'note',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'balance_before' => 'integer',
            'balance_after' => 'integer',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function memberCard(): BelongsTo
    {
        return $this->belongsTo(MemberCard::class);
    }

    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(CashAccount::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function sourceable(): MorphTo
    {
        return $this->morphTo();
    }
}
