<?php

namespace App\Models;

use App\Traits\BelongsToOutlet;
use App\Traits\LogsActivityCustom;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class CashTransaction extends Model
{
    use BelongsToOutlet, LogsActivityCustom;

    const UPDATED_AT = null;

    protected $fillable = [
        'reference', 'cash_account_id', 'cash_category_id', 'outlet_id',
        'cashier_session_id', 'type', 'transfer_to_account_id', 'amount',
        'balance_before', 'balance_after', 'transaction_date', 'description',
        'sourceable_type', 'sourceable_id', 'user_id', 'approved_by', 'attachment',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'balance_before' => 'integer',
            'balance_after' => 'integer',
            'transaction_date' => 'date',
        ];
    }

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(CashAccount::class);
    }

    public function transferToAccount(): BelongsTo
    {
        return $this->belongsTo(CashAccount::class, 'transfer_to_account_id');
    }

    public function cashCategory(): BelongsTo
    {
        return $this->belongsTo(CashCategory::class);
    }

    public function cashierSession(): BelongsTo
    {
        return $this->belongsTo(CashierSession::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sourceable(): MorphTo
    {
        return $this->morphTo();
    }
}
