<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashAccount extends Model
{
    protected $fillable = [
        'code', 'name', 'type', 'outlet_id', 'bank_name', 'account_number',
        'account_holder', 'opening_balance', 'is_default', 'is_drawer', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'opening_balance' => 'integer',
            'current_balance' => 'integer',
            'is_default' => 'boolean',
            'is_drawer' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(CashTransaction::class);
    }
}
