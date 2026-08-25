namespace App\Services\PaymentHandlers;

use App\Exceptions\InvalidPinException;
use App\Exceptions\MemberPinNotSetException;
use App\Models\CashierSession;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Services\MemberPinService;
use App\Services\PointService;
use DomainException;

/**
 * Konversi poin -> rupiah pakai config('pos.point_value'). Redemption
 * dicatat lewat PointService (ledger point_transactions, T-066) dengan
 * pola kunci baris yang sama seperti DepositService.
 * Memerlukan verifikasi PIN anggota.
 */
class PointHandler implements PaymentHandler
{
    public function __construct(
        private readonly PointService $pointService,
        private readonly MemberPinService $pinService,
    ) {}

    public function handle(Sale $sale, PaymentMethod $method, array $payload, ?Member $member, CashierSession $session, Outlet $outlet): SalePayment
    {
        if ($member === null) {
            throw new DomainException('Metode Poin membutuhkan anggota yang terpilih.');
        }

        if ($member->pin === null) {
            throw MemberPinNotSetException::make();
        }

        if (! $this->pinService->verify($member, (string) ($payload['pin'] ?? ''))) {
            throw InvalidPinException::make();
        }

        $pointUsed = (int) ($payload['point_used'] ?? 0);

        if ($pointUsed <= 0) {
            throw new DomainException('Jumlah poin yang dipakai harus lebih dari 0.');
        }

        $pointValue = (int) config('pos.point_value', 100);
        $amount = $pointUsed * $pointValue;

        $this->pointService->redeem($member, $pointUsed, $sale);

        return SalePayment::create([
            'sale_id' => $sale->id,
            'payment_method_id' => $method->id,
            'amount' => $amount,
            'point_used' => $pointUsed,
            'net_amount' => $amount,
            'status' => 'settled',
            'settled_at' => now(),
        ]);
    }
}
