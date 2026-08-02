<?php

namespace App\Models;

use App\Traits\LogsActivityCustom;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Coupon extends Model
{
    use LogsActivityCustom;

    protected $fillable = [
        'code', 'promo_id', 'name', 'discount_type', 'discount_value', 'max_discount',
        'min_purchase', 'valid_from', 'valid_until', 'quota', 'used_count', 'per_member_limit',
        'member_id', 'excluded_product_ids', 'status', 'source', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'discount_value' => 'integer',
            'max_discount' => 'integer',
            'min_purchase' => 'integer',
            'valid_from' => 'datetime',
            'valid_until' => 'datetime',
            'excluded_product_ids' => 'array',
        ];
    }

    public function promo(): BelongsTo
    {
        return $this->belongsTo(Promo::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(CouponRedemption::class);
    }
}
