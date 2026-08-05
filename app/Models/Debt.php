<?php

namespace App\Models;

use App\Traits\BelongsToOutlet;
use App\Traits\LogsActivityCustom;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Debt extends Model
{
    use BelongsToOutlet, LogsActivityCustom;

    protected $fillable = [
        'reference', 'supplier_id', 'purchase_id', 'outlet_id', 'total_amount',
        'paid_amount', 'remaining_amount', 'due_date', 'status',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'integer',
            'paid_amount' => 'integer',
            'remaining_amount' => 'integer',
            'due_date' => 'date',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(DebtPayment::class);
    }
}
