<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Traits\LogsActivityCustom;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    // T-106: kolom two_factor_* sudah ada di migration & fitur sudah
    // "aktif" di config('fortify.features') sejak awal proyek, tapi
    // trait ini TIDAK PERNAH ditambahkan — tanpanya method yang
    // dipanggil controller Fortify (forceFill two_factor_secret,
    // recoveryCodes(), dst) tidak ada sama sekali di model ini, 2FA
    // sepenuhnya tidak berfungsi meski terlihat "enabled".
    use HasFactory, HasRoles, LogsActivityCustom, Notifiable, SoftDeletes, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'phone',
        'avatar',
        'employee_code',
        'outlet_id',
        'password',
        'pin',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'pin',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'pin' => 'hashed',
            'is_active' => 'boolean',
        ];
    }
}
