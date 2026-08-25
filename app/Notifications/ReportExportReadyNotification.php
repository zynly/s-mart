<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * T-089. Channel `database` (dibaca panel "Ekspor Saya" di Reports
 * hub, Temuan E — bukan bel notifikasi global, itu tiket Fase 15
 * T-094) + `mail` (log-only lewat MAIL_MAILER=log di dev; SMTP
 * sungguhan adalah concern deploy Fase 18, bukan di sini).
 */
class ReportExportReadyNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $reportTitle,
        private readonly string $downloadUrl,
        private readonly int $rowCount,
    ) {}

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
            'title' => "Ekspor \"{$this->reportTitle}\" selesai",
            'message' => "Laporan \"{$this->reportTitle}\" ({$this->rowCount} baris) siap diunduh.",
            'report_title' => $this->reportTitle,
            'download_url' => $this->downloadUrl,
            'url' => $this->downloadUrl,
            'row_count' => $this->rowCount,
        ];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Ekspor \"{$this->reportTitle}\" selesai")
            ->line("Ekspor laporan \"{$this->reportTitle}\" ({$this->rowCount} baris) sudah selesai diproses.")
            ->action('Unduh Excel', $this->downloadUrl)
            ->line('Tautan ini hanya bisa diakses oleh akun Anda yang login.');
    }
}
