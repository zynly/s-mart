<?php

namespace App\Services;

use App\Models\Guardian;
use App\Models\Member;
use App\Models\NotificationLog;
use App\Services\WhatsApp\WhatsAppGatewayInterface;

/**
 * T-099/T-100 (Fase 16). Satu tempat untuk semua teks template WA +
 * pencatatan `notification_logs` — command (`notify:*`) TIDAK pernah
 * memanggil `WhatsAppGatewayInterface` langsung, supaya format pesan
 * dan jejak audit konsisten di satu tempat.
 */
class GuardianNotificationService
{
    public function __construct(private readonly WhatsAppGatewayInterface $gateway) {}

    public function lowBalance(Guardian $guardian, Member $member, int $balance): void
    {
        $this->dispatch($guardian, 'low_balance', "Saldo {$member->name} tinggal Rp".number_format($balance, 0, ',', '.').'. Yuk top-up lewat Portal Wali.');
    }

    public function receivableDue(Guardian $guardian, Member $member, int $remaining, string $dueDate): void
    {
        $this->dispatch($guardian, 'receivable_due', "Piutang {$member->name} sebesar Rp".number_format($remaining, 0, ',', '.')." jatuh tempo {$dueDate}.");
    }

    public function weeklySummary(Guardian $guardian, Member $member, int $totalSpent, int $transactionCount): void
    {
        $this->dispatch($guardian, 'weekly_summary', "Ringkasan minggu ini {$member->name}: {$transactionCount} transaksi, total belanja Rp".number_format($totalSpent, 0, ',', '.').'.');
    }

    public function birthday(Guardian $guardian, Member $member, int $bonusAmount): void
    {
        $this->dispatch($guardian, 'birthday', "Selamat ulang tahun, {$member->name}! Bonus saldo Rp".number_format($bonusAmount, 0, ',', '.').' sudah ditambahkan.');
    }

    public function birthdayCoupon(Guardian $guardian, Member $member, int $discountPercent): void
    {
        $this->dispatch($guardian, 'birthday', "Selamat ulang tahun, {$member->name}! Kupon diskon {$discountPercent}% sudah diterbitkan, cek di Portal Wali.");
    }

    public function topupVerified(Guardian $guardian, Member $member, int $amount): void
    {
        $this->dispatch($guardian, 'topup_verified', "Top-up {$member->name} sebesar Rp".number_format($amount, 0, ',', '.').' sudah diverifikasi dan masuk ke saldo.');
    }

    private function dispatch(Guardian $guardian, string $template, string $message): void
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
    }
}
