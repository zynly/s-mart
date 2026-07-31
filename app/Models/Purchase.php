<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Purchase extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'reference', 'purchase_order_id', 'supplier_id', 'outlet_id', 'invoice_no',
        'purchase_date', 'due_date', 'type', 'payment_type', 'subtotal', 'discount',
        'tax', 'other_cost', 'total', 'paid_amount', 'remaining_amount', 'status',
        'note', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'purchase_date' => 'date',
            'due_date' => 'date',
            'subtotal' => 'integer',
            'discount' => 'integer',
            'tax' => 'integer',
            'other_cost' => 'integer',
            'total' => 'integer',
            'paid_amount' => 'integer',
            'remaining_amount' => 'integer',
        ];
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
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
        return $this->hasMany(PurchaseItem::class);
    }

    public function otherCosts(): HasMany
    {
        return $this->hasMany(PurchaseOtherCost::class);
    }

    public function debt(): HasMany
    {
        return $this->hasMany(Debt::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
