<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Journal extends Model
{
    protected $fillable = [
        'reference', 'outlet_id', 'journal_date', 'type', 'description',
        'sourceable_type', 'sourceable_id', 'total_debit', 'total_credit',
        'is_balanced', 'status', 'reversed_journal_id', 'created_by',
        'posted_by', 'posted_at',
    ];

    protected function casts(): array
    {
        return [
            'journal_date' => 'date',
            'total_debit' => 'integer',
            'total_credit' => 'integer',
            'is_balanced' => 'boolean',
            'posted_at' => 'datetime',
        ];
    }

    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(JournalEntry::class);
    }

    public function sourceable(): MorphTo
    {
        return $this->morphTo();
    }

    public function reversedJournal(): BelongsTo
    {
        return $this->belongsTo(Journal::class, 'reversed_journal_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function poster(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }
}
