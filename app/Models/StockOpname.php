<?php

namespace App\Models;

use App\Traits\LogsActivityCustom;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockOpname extends Model
{
    use LogsActivityCustom, SoftDeletes;

    protected $fillable = [
        'reference', 'outlet_id', 'scope', 'scope_ids', 'opname_date', 'cutoff_at',
        'status', 'total_items', 'counted_items', 'total_variance_qty',
        'total_variance_value', 'variance_percent', 'is_blind',
        'started_by', 'reviewed_by', 'approved_by', 'posted_by',
        'reviewed_at', 'approved_at', 'posted_at', 'note',
    ];

    protected function casts(): array
    {
        return [
            'scope_ids' => 'array',
            'opname_date' => 'date',
            'cutoff_at' => 'datetime',
            'total_items' => 'integer',
            'counted_items' => 'integer',
            'total_variance_qty' => 'decimal:3',
            'total_variance_value' => 'integer',
            'variance_percent' => 'decimal:4',
            'is_blind' => 'boolean',
            'reviewed_at' => 'datetime',
            'approved_at' => 'datetime',
            'posted_at' => 'datetime',
        ];
    }

    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockOpnameItem::class);
    }

    public function starter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'started_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function poster(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }
}
