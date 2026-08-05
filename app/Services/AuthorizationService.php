<?php

namespace App\Services;

use App\Exceptions\AuthorizationOverrideException;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

/**
 * Audit independen (2026-08-02), Temuan Kritis #1: sebelumnya
 * `requestOverride()` mengembalikan `User $approver` mentah, lalu
 * controller mengirim `approver->id` balik ke frontend via flash
 * session — endpoint aksi (void/override harga/tutup sesi/dst) HANYA
 * mengecek `User::find($approver_id)->can($permission)`, TIDAK PERNAH
 * memverifikasi PIN itu benar-benar baru saja divalidasi UNTUK AKSI
 * INI. Siapa pun yang tahu/menebak ID user pemegang izin bisa
 * memalsukan approval tanpa PIN sama sekali (lewat DevTools/Postman).
 *
 * Perbaikan: PIN yang benar sekarang menghasilkan TOKEN sekali-pakai
 * (bukan ID approver mentah) yang terikat ke permission + peminta +
 * waktu kedaluwarsa pendek. Endpoint aksi WAJIB menukar token ini
 * lewat `consumeToken()` — bukan mempercayai ID apa pun dari client.
 */
class AuthorizationService
{
    public function requestOverride(string $permission, string $pin): User
    {
        $this->ensurePermissionExists($permission);

        $key = $this->throttleKey($permission);
        // Temuan audit keamanan (code-quality #1/#8): sebelumnya hardcode
        // 3/15, mengabaikan config('pos.pin_max_attempts')/
        // ('pos.pin_lockout_minutes') yang bisa diubah owner lewat
        // Pengaturan (T-103).
        $maxAttempts = (int) config('pos.pin_max_attempts', 3);
        $lockoutMinutes = (int) config('pos.pin_lockout_minutes', 15);

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            throw AuthorizationOverrideException::lockedOut(RateLimiter::availableIn($key));
        }

        $approver = $this->findMatchingUser($permission, $pin);

        if ($approver === null) {
            RateLimiter::hit($key, $lockoutMinutes * 60);
            $this->logAttempt($permission, null, success: false);

            throw AuthorizationOverrideException::invalidPin();
        }

        RateLimiter::clear($key);
        $this->logAttempt($permission, $approver, success: true);

        return $approver;
    }

    /**
     * Dipanggil oleh AuthorizationOverrideController SEGERA setelah
     * requestOverride() berhasil. Token disimpan server-side (cache),
     * bukan dikirim sebagai ID mentah — tidak bisa ditebak/dipalsukan,
     * cuma valid untuk permission+peminta ini, sekali pakai, TTL pendek.
     */
    public function issueToken(User $approver, string $permission): string
    {
        $token = Str::random(48);

        Cache::put($this->tokenKey($token), [
            'approver_id' => $approver->id,
            'permission' => $permission,
            'requester_id' => auth()->id(),
        ], now()->addMinutes((int) config('pos.pin_override_ttl_minutes', 2)));

        return $token;
    }

    /**
     * Satu-satunya cara sah bagi endpoint aksi (void, override harga/
     * diskon, tutup sesi selisih kas, approval retur/tukar barang) untuk
     * resolve approver — MENGGANTIKAN pola lama `User::find($request->
     * approver_id)` yang bisa dipalsukan. Token dibakar (dihapus dari
     * cache) begitu dibaca APAPUN hasilnya — mencegah percobaan ulang
     * (retry oracle) dan menjamin satu approval cuma bisa dipakai untuk
     * satu aksi.
     *
     * Mengembalikan null (bukan throw) supaya pemanggil bisa pakai pola
     * yang sudah ada di seluruh codebase: "$approver === null" berarti
     * "otorisasi tidak ada/tidak valid", konsisten dengan
     * VoidService::void()/SaleService::resolveApprover() sebelumnya.
     */
    public function consumeToken(?string $token, string $permission): ?User
    {
        if ($token === null || $token === '') {
            return null;
        }

        $key = $this->tokenKey($token);
        $payload = Cache::get($key);

        Cache::forget($key);

        if ($payload === null) {
            return null;
        }

        // Token terikat ke permission spesifik yang diminta saat PIN
        // divalidasi (tidak bisa "approve tutup sesi" lalu dipakai utk
        // void) DAN ke user yang sama yang memicu dialog PIN (mencegah
        // token yang bocor/disalin dipakai dari sesi login lain).
        if ($payload['permission'] !== $permission || $payload['requester_id'] !== auth()->id()) {
            return null;
        }

        $approver = User::query()->whereKey($payload['approver_id'])->where('is_active', true)->first();

        if ($approver === null || ! $approver->can($permission)) {
            return null;
        }

        activity('authorization')
            ->withProperties(['permission' => $permission, 'ip' => request()->ip()])
            ->causedBy($approver)
            ->log("Token override dipakai untuk {$permission}");

        return $approver;
    }

    private function tokenKey(string $token): string
    {
        return "authorization-override-token:{$token}";
    }

    private function ensurePermissionExists(string $permission): void
    {
        if (! Permission::where('name', $permission)->exists()) {
            throw AuthorizationOverrideException::permissionNotFound($permission);
        }
    }

    private function findMatchingUser(string $permission, string $pin): ?User
    {
        return User::query()
            ->whereNotNull('pin')
            ->where('is_active', true)
            ->permission($permission)
            ->get()
            ->first(fn (User $user) => Hash::check($pin, $user->pin));
    }

    private function throttleKey(string $permission): string
    {
        // Temuan audit keamanan (Phase B): sebelumnya key GLOBAL per
        // permission — 3 PIN salah dari SATU terminal mengunci override
        // permission itu untuk SEMUA orang di SEMUA terminal selama masa
        // lockout (kasir bisa memicu ini sengaja untuk memblokir void/
        // approve selisih kas/dll di seluruh toko). Di-key per (permission,
        // aktor yang meminta override) supaya satu kasir tidak bisa
        // mengunci toko — kasir lain tetap bisa minta override normal.
        return "authorization-override:{$permission}:".(auth()->id() ?? request()->ip());
    }

    private function logAttempt(string $permission, ?User $approver, bool $success): void
    {
        activity('authorization')
            ->withProperties([
                'permission' => $permission,
                'success' => $success,
                'ip' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ])
            ->causedBy($approver)
            ->log($success ? "Override disetujui untuk {$permission}" : "Override gagal untuk {$permission}");
    }
}
