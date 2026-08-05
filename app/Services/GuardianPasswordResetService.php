<?php

namespace App\Services;

use App\Models\Guardian;
use App\Models\Member;
use App\Models\User;
use App\Notifications\SuspiciousForgotPasswordAttemptNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

/**
 * REVISI-R1-v2.md §8.1 — "Lupa Password" wali lewat pertanyaan
 * keamanan (NIS + nama lengkap + tanggal lahir SALAH SATU anak,
 * dipilih acak oleh sistem). Aturan anti-enumerasi WAJIB dipatuhi di
 * SETIAP method di sini:
 *   - tidak pernah membocorkan nama/daftar anak wali,
 *   - tidak pernah membocorkan field mana yang salah (partial feedback),
 *   - alur tetap terlihat sama persis baik nomor HP terdaftar maupun
 *     tidak (langkah 1 SELALU lanjut ke langkah 2 dengan tampilan yang
 *     sama).
 */
class GuardianPasswordResetService
{
    private const MAX_ATTEMPTS = 3;

    private const LOCKOUT_HOURS = 24;

    private const CHALLENGE_TTL_MINUTES = 10;

    /**
     * Langkah 1: mulai tantangan. SELALU mengembalikan token yang
     * terlihat sama, baik nomor HP terdaftar maupun tidak — payload
     * internal-nya `guardian_id`/`member_id` bisa null, downstream
     * verifyAnswers() akan selalu gagal untuk token semacam itu tanpa
     * membedakan pesan errornya dari kasus jawaban salah biasa.
     */
    public function startChallenge(string $phone): string
    {
        $guardian = Guardian::where('phone', $phone)->where('is_active', true)->first();
        $member = $guardian?->members()->inRandomOrder()->first();

        $token = Str::random(48);

        Cache::put($this->challengeKey($token), [
            'phone' => $phone,
            'guardian_id' => $guardian?->id,
            'member_id' => $member?->id,
        ], now()->addMinutes(self::CHALLENGE_TTL_MINUTES));

        return $token;
    }

    public function isLockedOut(string $phone): bool
    {
        return Cache::has($this->lockoutKey($phone));
    }

    /**
     * Langkah 2: cocokkan NIS + nama lengkap + tanggal lahir anak
     * terhadap member yang dipilih startChallenge(). Ketiganya harus
     * cocok — tidak ada feedback sebagian.
     */
    public function verifyAnswers(string $token, string $nis, string $fullName, string $birthDate): ?string
    {
        $challenge = Cache::get($this->challengeKey($token));

        if ($challenge === null) {
            return null;
        }

        $phone = $challenge['phone'];

        if ($this->isLockedOut($phone)) {
            return null;
        }

        $matches = $challenge['member_id'] !== null && $this->answersMatch($challenge['member_id'], $nis, $fullName, $birthDate);

        activity('security')
            ->withProperties(['phone' => $phone, 'success' => $matches, 'ip' => request()->ip(), 'user_agent' => request()->userAgent()])
            ->log($matches ? 'Verifikasi lupa password wali berhasil' : 'Verifikasi lupa password wali gagal');

        if (! $matches) {
            $this->registerFailure($phone);

            return null;
        }

        Cache::forget($this->challengeKey($token));
        $this->clearAttempts($phone);

        $verifiedToken = Str::random(48);
        Cache::put($this->verifiedKey($verifiedToken), ['guardian_id' => $challenge['guardian_id']], now()->addMinutes(self::CHALLENGE_TTL_MINUTES));

        return $verifiedToken;
    }

    /**
     * Langkah 3: token hasil verifyAnswers() WAJIB, sekali pakai (dibakar
     * begitu dibaca, pola sama seperti AuthorizationService::consumeToken()).
     */
    public function resetPassword(string $verifiedToken, string $newPassword): ?Guardian
    {
        $key = $this->verifiedKey($verifiedToken);
        $payload = Cache::get($key);
        Cache::forget($key);

        if ($payload === null || $payload['guardian_id'] === null) {
            return null;
        }

        $guardian = Guardian::find($payload['guardian_id']);

        if ($guardian === null) {
            return null;
        }

        $guardian->forceFill(['password' => $newPassword])->save();

        activity('security')
            ->causedBy($guardian)
            ->withProperties(['guardian_id' => $guardian->id, 'ip' => request()->ip(), 'via' => 'forgot_password'])
            ->log("Wali {$guardian->name} berhasil reset password lewat pertanyaan keamanan");

        return $guardian;
    }

    private function answersMatch(int $memberId, string $nis, string $fullName, string $birthDate): bool
    {
        $member = Member::find($memberId);

        if ($member === null) {
            return false;
        }

        $nisMatch = $member->nis !== null && hash_equals((string) $member->nis, $nis);
        $nameMatch = hash_equals(mb_strtolower(trim($member->name)), mb_strtolower(trim($fullName)));
        $birthMatch = $member->birth_date !== null && hash_equals($member->birth_date->format('Y-m-d'), $birthDate);

        return $nisMatch && $nameMatch && $birthMatch;
    }

    private function registerFailure(string $phone): void
    {
        $attemptsKey = $this->attemptsKey($phone);
        $attempts = (int) Cache::get($attemptsKey, 0) + 1;
        Cache::put($attemptsKey, $attempts, now()->addHour());

        if ($attempts >= self::MAX_ATTEMPTS) {
            Cache::put($this->lockoutKey($phone), true, now()->addHours(self::LOCKOUT_HOURS));
            Cache::forget($attemptsKey);
            $this->notifyAdmins($phone);
        }
    }

    private function clearAttempts(string $phone): void
    {
        Cache::forget($this->attemptsKey($phone));
    }

    /**
     * REVISI-R1-v2.md §8.1 — "bila wali gagal berkali-kali, notifikasi
     * ke admin (indikasi ada yang coba jebol)".
     */
    private function notifyAdmins(string $phone): void
    {
        $admins = User::role(['owner', 'admin'])->get();

        Notification::send($admins, new SuspiciousForgotPasswordAttemptNotification($phone));
    }

    private function challengeKey(string $token): string
    {
        return "wali-forgot-challenge:{$token}";
    }

    private function verifiedKey(string $token): string
    {
        return "wali-forgot-verified:{$token}";
    }

    private function attemptsKey(string $phone): string
    {
        return "wali-forgot-attempts:{$phone}";
    }

    private function lockoutKey(string $phone): string
    {
        return "wali-forgot-lockout:{$phone}";
    }
}
