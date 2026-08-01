<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * T-095/T-096 (Fase 16). Akun login PORTAL WALI — entitas terpisah
 * dari `members.guardian_name/guardian_phone/guardian_relation`
 * (kolom lama itu tetap dipertahankan sebagai data kontak cepat di
 * kartu anggota, TIDAK dimigrasikan otomatis ke sini; linking ke
 * Member dilakukan admin secara eksplisit lewat `guardian_member`).
 * `Authenticatable` + guard `guardian` sendiri (config/auth.php) —
 * BUKAN dipaksakan ke model User/guard `web` yang sudah terikat
 * Fortify.
 */
class Guardian extends Authenticatable
{
    use Notifiable;

    protected $fillable = [
        'name', 'phone', 'email', 'password', 'relation', 'is_active', 'last_login_at',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(Member::class, 'guardian_member')->withPivot('is_primary')->withTimestamps();
    }

    public function notificationSetting(): HasOne
    {
        return $this->hasOne(NotificationSetting::class);
    }

    public function topupRequests(): HasMany
    {
        return $this->hasMany(TopupRequest::class);
    }
}
