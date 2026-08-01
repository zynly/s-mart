<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Account extends Model
{
    protected $fillable = [
        'code', 'name', 'type', 'subtype', 'parent_id', 'level',
        'normal_balance', 'is_system', 'is_active', 'description',
    ];

    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'is_system' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Account::class, 'parent_id');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(JournalEntry::class);
    }

    /**
     * Akun header/ringkasan (punya anak) tidak boleh menerima posting
     * langsung — cegah data Neraca/Laba-Rugi ambigu.
     */
    public function isLeaf(): bool
    {
        return ! $this->children()->exists();
    }
}
