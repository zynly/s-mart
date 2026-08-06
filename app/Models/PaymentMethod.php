<?php

namespace App\Models;

use App\Traits\LogsActivityCustom;
use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    use LogsActivityCustom;

    protected $fillable = [
        'code', 'name', 'type', 'cash_account_id', 'mdr_percent',
        'requires_reference', 'allows_change', 'sort_order', 'is_active',
        'midtrans_code', 'midtrans_active',
    ];

    protected function casts(): array
    {
        return [
            'mdr_percent' => 'decimal:2',
            'requires_reference' => 'boolean',
            'allows_change' => 'boolean',
            'is_active' => 'boolean',
            'midtrans_active' => 'boolean',
        ];
    }
}
