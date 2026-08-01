<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * T-094 (Fase 15). Satu class generik untuk semua notifikasi ambang
 * batas (stok kritis/kadaluwarsa, hutang jatuh tempo, piutang
 * menunggak, rekonsiliasi deposit belum selesai) — bukan satu class
 * per jenis, karena bentuknya sama persis (judul+pesan+tautan+kunci
 * dedup). Channel `database` saja (bukan `mail` seperti
 * `ReportExportReadyNotification`) — ini alert operasional harian,
 * bukan hasil satu aksi user yang perlu konfirmasi email.
 */
class AlertNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $title,
        private readonly string $message,
        private readonly string $url,
        private readonly string $dedupeKey,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'url' => $this->url,
            'dedupe_key' => $this->dedupeKey,
        ];
    }
}
