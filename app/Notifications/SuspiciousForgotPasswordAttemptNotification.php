<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * REVISI-R1-v2.md §8.1 — "bila wali gagal berkali-kali, notifikasi ke
 * admin (indikasi ada yang coba jebol)". Dikirim ke owner+admin sekali
 * saat nomor HP dikunci 24 jam (bukan tiap percobaan gagal, supaya
 * tidak membanjiri lonceng notifikasi).
 */
class SuspiciousForgotPasswordAttemptNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly string $phone) {}

    /**
     * @return array<int, string>
     */
    public function via($notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => 'Percobaan lupa password wali dicurigai',
            'phone' => $this->phone,
            'message' => "Nomor HP {$this->phone} gagal 3x menjawab pertanyaan keamanan lupa password Portal Wali dan dikunci 24 jam — kemungkinan ada yang mencoba membobol akun.",
        ];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Percobaan lupa password wali dicurigai — Skillage Mart')
            ->line("Nomor HP {$this->phone} gagal 3x menjawab pertanyaan keamanan lupa password Portal Wali dan telah dikunci selama 24 jam.")
            ->line('Ini bisa berupa indikasi ada pihak yang mencoba membobol akun wali. Periksa Log Aktivitas untuk detail percobaan.');
    }
}
