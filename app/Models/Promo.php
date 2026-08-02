<?php

namespace App\Models;

use App\Traits\LogsActivityCustom;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Promo extends Model
{
    use LogsActivityCustom, SoftDeletes;

    protected $fillable = [
        'code', 'name', 'description', 'type', 'scope', 'discount_type', 'discount_value',
        'max_discount', 'min_purchase', 'min_qty', 'buy_qty', 'get_qty', 'get_product_id',
        'tiers', 'start_date', 'end_date', 'start_time', 'end_time', 'days_of_week',
        'quota_total', 'quota_per_member', 'priority', 'is_stackable', 'outlet_ids',
        'is_public', 'is_active', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'discount_value' => 'integer',
            'max_discount' => 'integer',
            'min_purchase' => 'integer',
            'min_qty' => 'decimal:3',
            'buy_qty' => 'decimal:3',
            'get_qty' => 'decimal:3',
            'tiers' => 'array',
            'start_date' => 'date',
            'end_date' => 'date',
            'days_of_week' => 'array',
            'outlet_ids' => 'array',
            'is_stackable' => 'boolean',
            'is_public' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'promo_products');
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'promo_categories');
    }

    public function memberLevels(): BelongsToMany
    {
        return $this->belongsToMany(MemberLevel::class, 'promo_member_levels');
    }
}
