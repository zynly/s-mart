<?php

namespace App\Services;

use App\Models\Member;
use App\Models\MemberCard;
use Illuminate\Support\Facades\DB;

class CardService
{
    public function issue(Member $member): MemberCard
    {
        return MemberCard::create([
            'member_id' => $member->id,
            'card_number' => $member->member_number,
            'type' => 'barcode',
            'status' => 'active',
            'issued_at' => now(),
            'issued_by' => auth()->id(),
        ]);
    }

    public function block(MemberCard $card, string $reason): void
    {
        $card->update([
            'status' => 'blocked',
            'blocked_at' => now(),
            'block_reason' => $reason,
        ]);
    }

    /**
     * Kartu lama otomatis jadi 'replaced'. Saldo tidak berubah —
     * saldo ada di Member::balance_cache, bukan di kartu.
     */
    public function reissue(Member $member, string $reason): MemberCard
    {
        return DB::transaction(function () use ($member, $reason) {
            $current = $member->cards()->where('status', 'active')->lockForUpdate()->first();

            if ($current !== null) {
                $current->update([
                    'status' => 'replaced',
                    'blocked_at' => now(),
                    'block_reason' => $reason,
                ]);
            }

            $sequence = $member->cards()->count() + 1;

            return MemberCard::create([
                'member_id' => $member->id,
                'card_number' => sprintf('%s-%02d', $member->member_number, $sequence),
                'type' => 'barcode',
                'status' => 'active',
                'issued_at' => now(),
                'issued_by' => auth()->id(),
            ]);
        });
    }

    /**
     * Cari anggota via card_number (hanya kartu aktif), lalu
     * member_number, lalu NIS.
     */
    public function resolve(string $code): ?Member
    {
        $member = Member::whereHas(
            'cards',
            fn ($q) => $q->where('card_number', $code)->where('status', 'active')
        )->first();

        return $member
            ?? Member::where('member_number', $code)->first()
            ?? Member::where('nis', $code)->first();
    }
}
