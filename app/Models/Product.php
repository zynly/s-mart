<?php

namespace App\Models;

use App\Support\Str as SupportStr;
use App\Traits\LogsActivityCustom;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use LogsActivityCustom, SoftDeletes;

    protected $fillable = [
        'sku', 'name', 'slug', 'category_id', 'brand_id', 'base_unit_id',
        'description', 'is_expirable', 'is_consignment', 'consignment_percent',
        'min_stock', 'max_stock', 'is_active', 'is_favorite',
        'is_visible_public', 'description_public', 'public_order',
    ];

    protected static function booted(): void
    {
        static::creating(function (Product $product) {
            if (empty($product->slug)) {
                $product->slug = SupportStr::slugUnique($product->name, 'products');
            }
        });
    }

    protected function casts(): array
    {
        return [
            'is_expirable' => 'boolean',
            'is_consignment' => 'boolean',
            'is_active' => 'boolean',
            'is_favorite' => 'boolean',
            'is_visible_public' => 'boolean',
            'min_stock' => 'decimal:3',
            'max_stock' => 'decimal:3',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function baseUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'base_unit_id');
    }

    public function barcodes(): HasMany
    {
        return $this->hasMany(ProductBarcode::class);
    }

    public function prices(): HasMany
    {
        return $this->hasMany(ProductPrice::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function unitConversions(): HasMany
    {
        return $this->hasMany(UnitConversion::class);
    }
}
