<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\Log;

/**
 * T-099 (Fase 16). Default dev/MVP — cuma catat ke log, tidak benar-
 * benar mengirim apa pun, supaya dev tidak butuh kredensial Fonnte/
 * Wablas (ADR-0010). Selalu "berhasil" (return true) — jejak audit
 * sungguhan ada di `notification_logs` lewat `GuardianNotificationService`,
 * bukan di sini.
 */
class NullGateway implements WhatsAppGatewayInterface
{
    public function send(string $phone, string $message): bool
    {
        Log::info('[NullGateway] WA ke '.$phone.': '.$message);

        return true;
    }
}
