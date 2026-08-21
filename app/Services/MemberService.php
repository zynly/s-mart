<?php

namespace App\Services;

use App\Models\Member;
use App\Support\ReferenceGenerator;
use Illuminate\Support\Facades\DB;

class MemberService
{
    public function __construct(private readonly CardService $cardService) {}

    /**
     * @param  array<string, mixed>  $data  Kolom members.* (tanpa member_number)
     */
    public function create(array $data): Member
    {
        return DB::transaction(function () use ($data) {
            $entryYear = $data['entry_year'] ?? (int) now()->format('Y');
            $data['entry_year'] = $entryYear;
            $data['member_number'] = ReferenceGenerator::generateMemberNumber($data['type'], $entryYear);
            if (empty($data['pin'])) {
                $data['pin'] = MemberPinService::DEFAULT_PIN;
            }

            $member = Member::create($data);

            $this->cardService->issue($member);

            return $member->fresh(['level', 'cards']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Member $member, array $data): Member
    {
        $member->update($data);

        return $member->fresh(['level']);
    }

    public function changeClass(Member $member, string $className, ?string $major = null): Member
    {
        $member->update(['class_name' => $className, 'major' => $major]);

        return $member;
    }

    public function graduate(Member $member): Member
    {
        $member->update(['status' => 'graduated', 'graduated_at' => now()->toDateString()]);

        return $member;
    }

    public function reactivate(Member $member): Member
    {
        $member->update(['status' => 'active', 'suspended_until' => null, 'suspend_reason' => null]);

        return $member;
    }

    public function suspend(Member $member, string $reason, ?string $until = null): Member
    {
        $member->update([
            'status' => 'suspended',
            'suspend_reason' => $reason,
            'suspended_until' => $until,
        ]);

        return $member;
    }
}
