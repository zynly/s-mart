<?php

namespace App\Models;

use App\Traits\LogsActivityCustom;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashierSession extends Model
{
    use LogsActivityCustom;

    protected $fillable = [
        'reference', 'outlet_id', 'user_id', 'cash_account_id', 'opened_at',
        'closed_at', 'opening_cash', 'expected_cash', 'actual_cash', 'difference',
        'total_sales_cash', 'total_sales_deposit', 'total_sales_noncash',
        'total_topup_cash', 'total_receivable_cash', 'total_receivable_noncash',
        'total_cash_in', 'total_cash_out', 'total_drop', 'total_refund_cash',
        'transaction_count', 'void_count', 'status', 'difference_reason',
        'approved_by', 'approved_at', 'note',
    ];

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
            'opening_cash' => 'integer',
            'expected_cash' => 'integer',
            'actual_cash' => 'integer',
            'difference' => 'integer',
            'total_sales_cash' => 'integer',
            'total_sales_deposit' => 'integer',
            'total_sales_noncash' => 'integer',
            'total_topup_cash' => 'integer',
            'total_receivable_cash' => 'integer',
            'total_receivable_noncash' => 'integer',
            'total_cash_in' => 'integer',
            'total_cash_out' => 'integer',
            'total_drop' => 'integer',
            'total_refund_cash' => 'integer',
            'transaction_count' => 'integer',
            'void_count' => 'integer',
            'approved_at' => 'datetime',
        ];
    }

    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(CashAccount::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function cashTransactions(): HasMany
    {
        return $this->hasMany(CashTransaction::class);
    }
}
