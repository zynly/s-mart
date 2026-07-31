<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DepositReconciliation extends Model
{
    protected $fillable = [
        'member_id', 'checked_at', 'ledger_sum', 'cache_value', 'difference',
        'expected_by_recon', 'is_resolved', 'resolved_by', 'note',
    ];

    protected function casts(): array
    {
        return [
            'checked_at' => 'datetime',
            'ledger_sum' => 'integer',
            'cache_value' => 'integer',
            'difference' => 'integer',
            'expected_by_recon' => 'integer',
            'is_resolved' => 'boolean',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
