<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationSetting extends Model
{
    protected $fillable = [
        'guardian_id', 'low_balance_alert', 'low_balance_threshold', 'weekly_summary', 'transaction_alert',
    ];

    protected function casts(): array
    {
        return [
            'low_balance_alert' => 'boolean',
            'low_balance_threshold' => 'integer',
            'weekly_summary' => 'boolean',
            'transaction_alert' => 'boolean',
        ];
    }

    public function guardian(): BelongsTo
    {
        return $this->belongsTo(Guardian::class);
    }
}
