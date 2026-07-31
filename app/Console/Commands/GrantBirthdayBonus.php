<?php

namespace App\Console\Commands;

use App\Models\DepositTransaction;
use App\Models\Member;
use App\Services\DepositService;
use Illuminate\Console\Command;

class GrantBirthdayBonus extends Command
{
    protected $signature = 'member:birthday-bonus';

    protected $description = 'Beri bonus saldo otomatis untuk anggota aktif yang berulang tahun hari ini (maksimal sekali per tahun)';

    public function __construct(private readonly DepositService $depositService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $today = now();
        $amount = (int) config('pos.birthday_bonus_amount', 10000);
        $granted = 0;

        Member::query()
            ->where('status', 'active')
            ->whereNotNull('birth_date')
            ->whereMonth('birth_date', $today->month)
            ->whereDay('birth_date', $today->day)
            ->orderBy('id')
            ->chunkById(200, function ($members) use ($amount, $today, &$granted) {
                foreach ($members as $member) {
                    $key = "birthday-bonus-{$member->id}-{$today->year}";

                    if (DepositTransaction::where('idempotency_key', $key)->exists()) {
                        continue;
                    }

                    $this->depositService->bonus($member, $amount, 'Bonus ulang tahun', $key);
                    $granted++;
                    $this->info("Bonus ulang tahun Rp {$amount} diberikan ke {$member->name} (#{$member->member_number})");
                }
            });

        $this->info("Selesai: {$granted} anggota menerima bonus ulang tahun.");

        return self::SUCCESS;
    }
}
