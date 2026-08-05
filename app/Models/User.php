<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Traits\LogsActivityCustom;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    // T-106 (SELESAI): kolom two_factor_* sudah ada di migration, fitur
    // aktif di config('fortify.features'), dan trait di bawah ini SUDAH
    // terpasang — 2FA berfungsi penuh (diverifikasi end-to-end lewat
    // Playwright: aktifkan->scan QR->kode pemulihan->logout->login wajib
    // tantangan 2FA). Audit Fase 7 (Temuan Rendah): komentar lama di
    // sini masih bilang "TIDAK PERNAH ditambahkan/tidak berfungsi" —
    // sudah tidak akurat & berisiko menyesatkan audit berikutnya kalau
    // tidak diverifikasi ulang ke kode aslinya.
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
        // REVISI-R1-v2.md §1.3: DEPRECATED sebagai sumber kebenaran —
        // dipertahankan untuk kompatibilitas & fallback (lihat
        // outletIds()/primaryOutletId()). Penempatan outlet user
        // sekarang lewat tabel banyak-ke-banyak `outlet_user`.
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

    /**
     * REVISI-R1-v2.md §1.3 — relasi banyak-ke-banyak user↔outlet.
     */
    public function outlets(): BelongsToMany
    {
        return $this->belongsToMany(Outlet::class, 'outlet_user')->withPivot('is_primary')->withTimestamps();
    }

    public function primaryOutlet(): ?Outlet
    {
        $primary = $this->outlets()->wherePivot('is_primary', true)->first();

        if ($primary !== null) {
            return $primary;
        }

        // Fallback: baris pivot ada tapi tak satu pun ditandai primary
        // (data lama), atau kolom legacy users.outlet_id masih dipakai
        // langsung tanpa pernah lewat outlet_user sama sekali.
        return $this->outlets()->first() ?? ($this->outlet_id ? Outlet::find($this->outlet_id) : null);
    }

    public function primaryOutletId(): ?int
    {
        return $this->primaryOutlet()?->id;
    }

    /**
     * Dipakai BelongsToOutlet::bootBelongsToOutlet() untuk scope query.
     * Fallback ke kolom legacy `outlet_id` bila baris `outlet_user`
     * belum ada sama sekali (lihat komentar di trait itu sendiri).
     *
     * @return Collection<int, int>
     */
    public function outletIds(): Collection
    {
        $ids = $this->outlets()->pluck('outlets.id');

        if ($ids->isEmpty() && $this->outlet_id !== null) {
            $ids = collect([$this->outlet_id]);
        }

        return $ids;
    }

    /**
     * REVISI-R1-v2.md §1.3 — validasi penempatan: owner tidak perlu
     * baris (bypass total), admin boleh banyak outlet, role lain
     * (supervisor/cashier/warehouse/treasurer) maksimal SATU outlet.
     */
    public function canBeAssignedToAdditionalOutlet(): bool
    {
        if ($this->hasRole('owner') || $this->hasRole('admin')) {
            return true;
        }

        return $this->outlets()->count() === 0;
    }
}
