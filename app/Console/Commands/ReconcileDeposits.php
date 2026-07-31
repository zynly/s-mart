<?php

namespace App\Console\Commands;

use App\Models\DepositReconciliation;
use App\Models\DepositTransaction;
use App\Models\Member;
use Illuminate\Console\Command;

class ReconcileDeposits extends Command
{
    protected $signature = 'deposit:reconcile {--fix : Perbaiki balance_cache yang selisih}';

    protected $description = 'Bandingkan SUM(amount) ledger deposit_transactions dengan members.balance_cache, catat selisih ke deposit_reconciliations';

    public function handle(): int
    {
        $fix = (bool) $this->option('fix');
        $checkedAt = now();
        $mismatches = 0;

        Member::query()->orderBy('id')->chunkById(200, function ($members) use ($fix, $checkedAt, &$mismatches) {
            foreach ($members as $member) {
                $ledgerSum = (int) DepositTransaction::where('member_id', $member->id)->sum('amount');
                $cacheValue = $member->balance_cache;
                $difference = $cacheValue - $ledgerSum;

                if ($difference === 0) {
                    continue;
                }

                $mismatches++;

                DepositReconciliation::create([
                    'member_id' => $member->id,
                    'checked_at' => $checkedAt,
                    'ledger_sum' => $ledgerSum,
                    'cache_value' => $cacheValue,
                    'difference' => $difference,
                    'expected_by_recon' => $ledgerSum,
                    'is_resolved' => false,
                ]);

                $this->warn("Selisih anggota #{$member->id} ({$member->name}): cache={$cacheValue} ledger={$ledgerSum} selisih={$difference}");

                if ($fix) {
                    // balance_cache sengaja tidak fillable di Member — forceFill()
                    // wajib dipakai di jalur resmi manapun yang menulisnya.
                    $member->forceFill(['balance_cache' => $ledgerSum])->save();
                    $this->info("  -> balance_cache diperbaiki ke {$ledgerSum}");
                }
            }
        });

        $this->info($mismatches === 0
            ? 'Rekonsiliasi selesai: semua saldo cocok, tidak ada selisih.'
            : "Rekonsiliasi selesai: {$mismatches} anggota memiliki selisih saldo.");

        return self::SUCCESS;
    }
}
