<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TopupRequest extends Model
{
    protected $fillable = [
        'reference', 'member_id', 'amount', 'proof_image', 'bank_name',
        'sender_name', 'transfer_date', 'status', 'verified_by',
        'verified_at', 'reject_reason',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'transfer_date' => 'date',
            'verified_at' => 'datetime',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
