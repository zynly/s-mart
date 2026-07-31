<?php

namespace App\Console\Commands;

use App\Models\Coupon;
use App\Models\DepositTransaction;
use App\Models\Member;
use App\Services\DepositService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class GrantBirthdayBonus extends Command
{
    protected $signature = 'member:birthday-bonus';

    protected $description = 'Beri bonus ulang tahun otomatis untuk anggota aktif (saldo atau kupon personal, sesuai config pos.birthday_bonus_mode; maksimal sekali per tahun)';

    public function __construct(private readonly DepositService $depositService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $today = now();
        $mode = config('pos.birthday_bonus_mode', 'deposit');
        $granted = 0;

        Member::query()
            ->where('status', 'active')
            ->whereNotNull('birth_date')
            ->whereMonth('birth_date', $today->month)
            ->whereDay('birth_date', $today->day)
            ->orderBy('id')
            ->chunkById(200, function ($members) use ($mode, $today, &$granted) {
                foreach ($members as $member) {
                    $alreadyGranted = $mode === 'coupon'
                        ? Coupon::where('member_id', $member->id)->where('source', 'birthday')
                            ->whereYear('created_at', $today->year)->exists()
                        : DepositTransaction::where('idempotency_key', "birthday-bonus-{$member->id}-{$today->year}")->exists();

                    if ($alreadyGranted) {
                        continue;
                    }

                    if ($mode === 'coupon') {
                        $this->grantCoupon($member, $today);
                    } else {
                        $this->grantDeposit($member, $today);
                    }

                    $granted++;
                }
            });

        $this->info("Selesai: {$granted} anggota menerima bonus ulang tahun (mode: {$mode}).");

        return self::SUCCESS;
    }

    private function grantDeposit(Member $member, Carbon $today): void
    {
        $amount = (int) config('pos.birthday_bonus_amount', 10000);
        $key = "birthday-bonus-{$member->id}-{$today->year}";

        $this->depositService->bonus($member, $amount, 'Bonus ulang tahun', $key);
        $this->info("Bonus saldo Rp {$amount} diberikan ke {$member->name} (#{$member->member_number})");
    }

    private function grantCoupon(Member $member, Carbon $today): void
    {
        $validDays = (int) config('pos.birthday_coupon_valid_days', 7);
        $discountPercent = (int) config('pos.birthday_coupon_discount_percent', 10);

        Coupon::create([
            'code' => 'BDAY-'.strtoupper(Str::random(8)),
            'name' => "Kupon Ulang Tahun {$member->name}",
            'discount_type' => 'percent',
            'discount_value' => $discountPercent,
            'valid_from' => $today->startOfDay(),
            'valid_until' => $today->copy()->addDays($validDays)->endOfDay(),
            'quota' => 1,
            'per_member_limit' => 1,
            'member_id' => $member->id,
            'status' => 'active',
            'source' => 'birthday',
        ]);

        $this->info("Kupon ulang tahun {$discountPercent}% (berlaku {$validDays} hari) diterbitkan untuk {$member->name} (#{$member->member_number})");
    }
}
