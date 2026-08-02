<?php

namespace App\Models;

use App\Traits\LogsActivityCustom;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemberCard extends Model
{
    use LogsActivityCustom;

    protected $fillable = [
        'member_id', 'card_number', 'type', 'status', 'issued_at',
        'blocked_at', 'block_reason', 'print_count', 'last_used_at', 'issued_by',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
            'blocked_at' => 'datetime',
            'last_used_at' => 'datetime',
            'print_count' => 'integer',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }
}
