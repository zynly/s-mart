<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code', 'name', 'contact_person', 'phone', 'email', 'address',
        'payment_term_days', 'is_consignor', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_consignor' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
