<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * T-099 (Fase 16). Berbeda dari tabel `notifications` bawaan Laravel
 * (dipakai bel in-app Fase 15, T-094) — ini jejak audit pengiriman WA
 * (channel/template/payload/status/error), diisi tiap kali
 * `WhatsAppGatewayInterface::send()` dipanggil, terlepas dari gateway
 * yang dipakai (`NullGateway` atau nanti Fonnte/Wablas).
 */
class NotificationLog extends Model
{
    protected $fillable = [
        'notifiable_type', 'notifiable_id', 'channel', 'template', 'payload', 'status', 'sent_at', 'error',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'sent_at' => 'datetime',
        ];
    }

    public function notifiable(): MorphTo
    {
        return $this->morphTo();
    }
}
