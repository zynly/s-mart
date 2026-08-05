<?php

namespace App\Models;

use App\Traits\BelongsToOutlet;
use App\Traits\LogsActivityCustom;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseReturn extends Model
{
    use BelongsToOutlet, LogsActivityCustom;

    protected $fillable = [
        'reference', 'purchase_id', 'supplier_id', 'outlet_id', 'return_date',
        'reason', 'total', 'status', 'approved_by', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'return_date' => 'date',
            'total' => 'integer',
        ];
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseReturnItem::class);
    }
}
