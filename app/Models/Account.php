<?php

namespace App\Models;

use App\Traits\LogsActivityCustom;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;

class Account extends Model
{
    use LogsActivityCustom;

    /**
     * T-107: JournalService cache seluruh chart of accounts (kecil, jarang
     * berubah) sekali per request-siklus TTL — batalkan cache begitu ada
     * perubahan supaya posting jurnal berikutnya tidak memakai kode akun
     * yang sudah dihapus/diubah.
     */
    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('accounts.by_code'));
        static::deleted(fn () => Cache::forget('accounts.by_code'));
    }

    protected $fillable = [
        'code', 'name', 'type', 'subtype', 'parent_id', 'level',
        'normal_balance', 'is_system', 'is_active', 'description',
    ];

    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'is_system' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Account::class, 'parent_id');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(JournalEntry::class);
    }

    /**
     * Akun header/ringkasan (punya anak) tidak boleh menerima posting
     * langsung — cegah data Neraca/Laba-Rugi ambigu.
     */
    public function isLeaf(): bool
    {
        return ! $this->children()->exists();
    }
}
