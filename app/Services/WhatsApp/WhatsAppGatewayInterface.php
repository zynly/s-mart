<?php

namespace App\Services\WhatsApp;

/**
 * T-099 (Fase 16). Kontrak tunggal untuk semua implementasi pengirim
 * WhatsApp — `NullGateway` (default MVP, log-only) sekarang,
 * `FonnteGateway`/`WablasGateway` menyusul (ADR-0010) tanpa mengubah
 * satu baris pun kode pemanggil (`GuardianNotificationService`).
 */
interface WhatsAppGatewayInterface
{
    public function send(string $phone, string $message): bool;
}
