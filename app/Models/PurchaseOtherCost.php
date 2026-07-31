<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOtherCost extends Model
{
    protected $fillable = ['purchase_id', 'name', 'amount', 'allocation'];

    protected function casts(): array
    {
        return ['amount' => 'integer'];
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }
}
