<?php

namespace App\Services\PaymentHandlers;

use App\Models\CashierSession;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\User;
use App\Services\CashierSessionService;
use DomainException;
use Illuminate\Support\Facades\Hash;

/**
 * Satu-satunya metode yang boleh menghasilkan kembalian.
 * Memerlukan verifikasi PIN kasir sebelum transaksi tunai diselesaikan.
 */
class CashHandler implements PaymentHandler
{
    public function __construct(private readonly CashierSessionService $sessionService) {}

    public function handle(Sale $sale, PaymentMethod $method, array $payload, ?Member $member, CashierSession $session, Outlet $outlet): SalePayment
    {
        $pin = trim((string) ($payload['pin'] ?? ''));
        if ($pin === '') {
            throw new DomainException('Pembayaran Tunai membutuhkan PIN kasir.');
        }

        // Cek PIN murni terhadap kolom 'pin' di database (users.pin)
        $activeUser = $session->user ?? auth()->user();
        $isPinValid = false;

        if ($activeUser && ! empty($activeUser->pin)) {
            $isPinValid = Hash::check($pin, $activeUser->pin);
        }

        if (! $isPinValid) {
            $isPinValid = User::whereNotNull('pin')
                ->where('is_active', true)
                ->get()
                ->contains(fn (User $u) => Hash::check($pin, $u->pin));
        }

        if (! $isPinValid) {
            throw new DomainException('PIN kasir untuk pembayaran Tunai tidak valid.');
        }

        $amount = (int) $payload['amount'];
        $received = (int) ($payload['received_amount'] ?? $amount);
        $change = max(0, $received - $amount);

        $this->sessionService->addSaleCash($session, $amount);

        return SalePayment::create([
            'sale_id' => $sale->id,
            'payment_method_id' => $method->id,
            'amount' => $amount,
            'received_amount' => $received,
            'change_amount' => $change,
            'cash_account_id' => $session->cash_account_id,
            'net_amount' => $amount,
            'status' => 'settled',
            'settled_at' => now(),
        ]);
    }
}
