<?php

namespace App\Models;

use App\Traits\LogsActivityCustom;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Member extends Model
{
    use LogsActivityCustom, SoftDeletes;

    protected $fillable = [
        'member_number', 'name', 'nis', 'member_level_id', 'type',
        'class_name', 'major', 'entry_year', 'gender', 'birth_date',
        'phone', 'address', 'photo', 'guardian_name', 'guardian_phone',
        'guardian_relation', 'receivable_limit', 'daily_limit', 'weekly_limit',
        'allowed_hours', 'allowed_days', 'blocked_categories', 'status',
        'suspended_until', 'suspend_reason', 'joined_at', 'graduated_at',
        'pin', 'pin_attempts', 'pin_locked_until',
    ];

    protected function casts(): array
    {
        return [
            'pin' => 'hashed',
            'birth_date' => 'date',
            'balance_cache' => 'integer',
            'point_balance' => 'integer',
            'receivable_limit' => 'integer',
            'daily_limit' => 'integer',
            'weekly_limit' => 'integer',
            'allowed_hours' => 'array',
            'allowed_days' => 'array',
            'blocked_categories' => 'array',
            'suspended_until' => 'datetime',
            'pin_locked_until' => 'datetime',
            'joined_at' => 'date',
            'graduated_at' => 'date',
        ];
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(MemberLevel::class, 'member_level_id');
    }

    public function cards(): HasMany
    {
        return $this->hasMany(MemberCard::class);
    }

    public function activeCard(): HasOne
    {
        return $this->hasOne(MemberCard::class)->where('status', 'active');
    }

    public function receivables(): HasMany
    {
        return $this->hasMany(Receivable::class);
    }

    /**
     * T-095 (Fase 16). Wali dengan akun login Portal Wali — beda dari
     * kolom `guardian_name`/`guardian_phone`/`guardian_relation` di
     * atas yang murni data kontak (bukan akun).
     */
    public function guardians(): BelongsToMany
    {
        return $this->belongsToMany(Guardian::class, 'guardian_member')->withPivot('is_primary')->withTimestamps();
    }
}
