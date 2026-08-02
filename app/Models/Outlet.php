<?php

namespace App\Models;

use App\Traits\LogsActivityCustom;
use Illuminate\Database\Eloquent\Model;

class Outlet extends Model
{
    use LogsActivityCustom;

    protected $fillable = ['code', 'name', 'address', 'phone', 'is_main', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_main' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
