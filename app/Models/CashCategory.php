<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashCategory extends Model
{
    protected $fillable = ['code', 'name', 'type', 'account_code', 'is_system', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
