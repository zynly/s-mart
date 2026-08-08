<?php

use App\Services\Midtrans\NullMidtransGateway;
use App\Services\WhatsApp\NullGateway;

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // T-099 (Fase 16): default NullGateway (log-only) — isi dengan
    // App\Services\WhatsApp\FonnteGateway::class dkk. saat kredensial
    // sungguhan sudah ada (ADR-0010), tanpa ubah kode.
    'whatsapp' => [
        'gateway' => env('WHATSAPP_GATEWAY', NullGateway::class),
    ],

    // Integrasi Midtrans (top-up wali via Snap) — default
    // NullMidtransGateway (tidak memanggil API sungguhan) supaya dev
    // lokal & test tidak butuh kredensial. Isi MIDTRANS_GATEWAY di
    // .env produksi/sandbox dengan App\Services\Midtrans\
    // MidtransGateway::class untuk mengaktifkan panggilan API nyata.
    'midtrans' => [
        'gateway' => env('MIDTRANS_GATEWAY', NullMidtransGateway::class),
        'is_production' => filter_var(env('MIDTRANS_IS_PRODUCTION', false), FILTER_VALIDATE_BOOLEAN),
        'server_key' => filter_var(env('MIDTRANS_IS_PRODUCTION', false), FILTER_VALIDATE_BOOLEAN)
            ? (env('MIDTRANS_PRODUCTION_SERVER_KEY') ?: env('MIDTRANS_SERVER_KEY'))
            : (env('MIDTRANS_SANDBOX_SERVER_KEY') ?: env('MIDTRANS_SERVER_KEY')),
        'client_key' => filter_var(env('MIDTRANS_IS_PRODUCTION', false), FILTER_VALIDATE_BOOLEAN)
            ? (env('MIDTRANS_PRODUCTION_CLIENT_KEY') ?: env('MIDTRANS_CLIENT_KEY'))
            : (env('MIDTRANS_SANDBOX_CLIENT_KEY') ?: env('MIDTRANS_CLIENT_KEY')),
        'merchant_id' => filter_var(env('MIDTRANS_IS_PRODUCTION', false), FILTER_VALIDATE_BOOLEAN)
            ? (env('MIDTRANS_PRODUCTION_MERCHANT_ID') ?: env('MIDTRANS_MERCHANT_ID'))
            : (env('MIDTRANS_SANDBOX_MERCHANT_ID') ?: env('MIDTRANS_MERCHANT_ID')),
    ],

];
