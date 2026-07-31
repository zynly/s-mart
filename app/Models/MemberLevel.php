<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MemberLevel extends Model
{
    protected $fillable = [
        'code', 'name', 'min_spending', 'discount_percent',
        'point_multiplier', 'color', 'is_default', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'min_spending' => 'integer',
            'discount_percent' => 'decimal:2',
            'point_multiplier' => 'decimal:2',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function members(): HasMany
    {
        return $this->hasMany(Member::class);
    }
}
