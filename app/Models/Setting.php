<?php

namespace App\Models;

use App\Traits\LogsActivityCustom;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use LogsActivityCustom;

    protected $fillable = ['group', 'key', 'value', 'type', 'label', 'description'];

    public function castValue(): string|int|float|bool|null
    {
        return match ($this->type) {
            'integer' => $this->value === null ? null : (int) $this->value,
            'decimal' => $this->value === null ? null : (float) $this->value,
            'boolean' => (bool) $this->value,
            default => $this->value,
        };
    }
}
