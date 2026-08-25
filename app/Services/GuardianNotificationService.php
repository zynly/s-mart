<?php

namespace App\Services;

use App\Models\Guardian;
use App\Models\Member;
use App\Models\NotificationLog;
use App\Notifications\AlertNotification;
use App\Services\WhatsApp\WhatsAppGatewayInterface;

/**
 * T-099/T-100 (Fase 16). Satu tempat untuk semua teks template WA +
 * pencatatan `notification_logs` — command (`notify:*`) TIDAK pernah
 * memanggil `WhatsAppGatewayInterface` langsung, supaya format pesan
 * dan jejak audit konsisten di satu tempat.
 *
 * fase-16-v2.md §8-9 (keputusan sesi ini): notifikasi dalam-aplikasi
 * (lonceng `WaliLayout`, tabel `notifications` bawaan Laravel via
 * `Guardian::notify()`) ditambahkan DI SAMPING WA yang sudah berjalan
 * di produksi — bukan pengganti. `dispatch()` sekarang mengirim KEDUA
 * kanal sekaligus dari satu tempat, supaya command `notify:*` tetap
 * tidak pernah menyentuh gateway/notifikasi langsung.
 */
class GuardianNotificationService
{
    public function __construct(private readonly WhatsAppGatewayInterface $gateway) {}

    public function lowBalance(Guardian $guardian, Member $member, int $balance): void
    {
        $this->dispatch(
            $guardian, 'low_balance', 'Saldo Menipis ⚠️',
            "Saldo {$member->name} tinggal Rp".number_format($balance, 0, ',', '.').'. Yuk top-up lewat Portal Wali.',
            route('wali.members.show', $member),
            "low_balance-{$guardian->id}-{$member->id}-".now()->format('Y-m-d'),
        );
    }

    public function receivableDue(Guardian $guardian, Member $member, int $remaining, string $dueDate): void
    {
        $this->dispatch(
            $guardian, 'receivable_due', 'Piutang Jatuh Tempo',
            "Piutang {$member->name} sebesar Rp".number_format($remaining, 0, ',', '.')." jatuh tempo {$dueDate}.",
            route('wali.members.show', $member),
            "receivable_due-{$guardian->id}-{$member->id}-".now()->format('Y-m-d'),
        );
    }

    public function weeklySummary(Guardian $guardian, Member $member, int $totalSpent, int $transactionCount): void
    {
        $this->dispatch(
            $guardian, 'weekly_summary', 'Rekap Minggu Ini 📊',
            "Ringkasan minggu ini {$member->name}: {$transactionCount} transaksi, total belanja Rp".number_format($totalSpent, 0, ',', '.').'.',
            route('wali.members.show', $member),
            "weekly_summary-{$guardian->id}-{$member->id}-".now()->format('Y-m-d'),
        );
    }

    public function birthday(Guardian $guardian, Member $member, int $bonusAmount): void
    {
        $this->dispatch(
            $guardian, 'birthday', 'Selamat Ulang Tahun! 🎂',
            "Selamat ulang tahun, {$member->name}! Bonus saldo Rp".number_format($bonusAmount, 0, ',', '.').' sudah ditambahkan.',
            route('wali.members.show', $member),
            "birthday-{$guardian->id}-{$member->id}-".now()->format('Y'),
        );
    }

    public function birthdayCoupon(Guardian $guardian, Member $member, int $discountPercent): void
    {
        $this->dispatch(
            $guardian, 'birthday', 'Selamat Ulang Tahun! 🎂',
            "Selamat ulang tahun, {$member->name}! Kupon diskon {$discountPercent}% sudah diterbitkan, cek di Portal Wali.",
            route('wali.members.show', $member),
            "birthday-{$guardian->id}-{$member->id}-".now()->format('Y'),
        );
    }

    public function topupVerified(Guardian $guardian, Member $member, int $amount): void
    {
        $this->dispatch(
            $guardian, 'topup_verified', 'Top-Up Berhasil ✅',
            "Top-up {$member->name} sebesar Rp".number_format($amount, 0, ',', '.').' sudah diverifikasi dan masuk ke saldo.',
            route('wali.members.show', $member),
            "topup_verified-{$guardian->id}-{$member->id}-".now()->format('YmdHis'),
        );
    }

    /**
     * fase-16-v2.md §8 (gap ditemukan saat audit sesi ini):
     * `TopupRequestController::reject()` sebelumnya TIDAK PERNAH
     * memberi tahu wali sama sekali — wali cuma tahu ditolak kalau
     * membuka Riwayat Top-Up sendiri. Sekarang selalu dikabari,
     * termasuk alasannya.
     */
    public function topupRejected(Guardian $guardian, Member $member, int $amount, string $reason): void
    {
        $this->dispatch(
            $guardian, 'topup_rejected', 'Top-Up Ditolak ❌',
            "Top-up {$member->name} sebesar Rp".number_format($amount, 0, ',', '.')." ditolak. Alasan: {$reason}. Silakan ajukan ulang atau hubungi admin.",
            route('wali.topup.create'),
            "topup_rejected-{$guardian->id}-{$member->id}-".now()->format('YmdHis'),
        );
    }

    /**
     * Temuan audit keamanan (Phase B): sebelumnya admin bisa reset
     * password wali kapan saja tanpa wali diberi tahu sama sekali —
     * satu-satunya sinyal bagi wali (kalau bukan dia yang minta) adalah
     * tiba-tiba tidak bisa login. Sekarang selalu dikabari lewat kanal
     * yang sama seperti notifikasi lain.
     */
    public function passwordReset(Guardian $guardian): void
    {
        $this->dispatch(
            $guardian, 'password_reset', 'Password Diubah',
            'Password Portal Wali Anda baru saja direset oleh admin sekolah. Kalau ini bukan permintaan Anda, segera hubungi admin.',
            route('wali.settings.edit'),
            "password_reset-{$guardian->id}-".now()->format('YmdHis'),
        );
    }

    private function dispatch(Guardian $guardian, string $template, string $title, string $message, string $url, string $dedupeKey): void
    {
        $sent = $this->gateway->send($guardian->phone, $message);

        NotificationLog::create([
            'notifiable_type' => Guardian::class,
            'notifiable_id' => $guardian->id,
            'channel' => 'wa',
            'template' => $template,
            'payload' => ['message' => $message],
            'status' => $sent ? 'sent' : 'failed',
            'sent_at' => $sent ? now() : null,
        ]);

        $alreadyNotified = $guardian->unreadNotifications()
            ->where(function ($q) use ($dedupeKey) {
                $q->where('data', 'like', '%"dedupe_key":"'.$dedupeKey.'"%')
                  ->orWhere('data', 'like', '%"dedupe_key": "'.$dedupeKey.'"%');
            })
            ->exists();

        if (! $alreadyNotified) {
            $guardian->notify(new AlertNotification($title, $message, $url, $dedupeKey));
        }
    }
}
