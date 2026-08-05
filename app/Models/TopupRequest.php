<?php

namespace App\Models;

use App\Traits\LogsActivityCustom;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TopupRequest extends Model
{
    use LogsActivityCustom;

    protected $fillable = [
        'reference', 'member_id', 'guardian_id', 'amount', 'proof_image', 'proof_hash', 'bank_name',
        'sender_name', 'transfer_date', 'status', 'verified_by',
        'verified_at', 'reject_reason', 'payment_provider', 'payment_reference',
        'bank_verified_by', 'bank_verified_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'transfer_date' => 'date',
            'verified_at' => 'datetime',
            'bank_verified_at' => 'datetime',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function guardian(): BelongsTo
    {
        return $this->belongsTo(Guardian::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function bankVerifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'bank_verified_by');
    }
}
