<?php

use App\Models\Guardian;
use App\Models\Member;
use App\Models\User;
use App\Services\AuthorizationService;
use App\Services\TopupRequestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

/**
 * REVISI-R1-v2.md §6.3 Jalur B — verifikasi transfer wali:
 * (a) nominal > Rp 500.000 wajib PIN supervisor/owner saat approve();
 * (b) bukti transfer (hash file) yang identik dengan bukti pada
 *     pengajuan yang SUDAH disetujui ditolak saat submit();
 * (c) pengajuan dengan nominal & tanggal transfer sama ditandai
 *     "Duga Duplikat" untuk ditinjau admin (bukan otomatis ditolak).
 */
function guardianForTopup(): Guardian
{
    return Guardian::create(['name' => 'Wali Uji Transfer', 'phone' => '0813'.random_int(10000000, 99999999), 'password' => 'Password123', 'is_active' => true]);
}

it('rejects approving a large transfer topup without a supervisor PIN token', function () {
    $admin = User::role('admin')->firstOrFail();
    $guardian = guardianForTopup();
    $member = Member::create(['member_number' => 'TRF1', 'name' => 'Anggota Transfer', 'type' => 'santri', 'status' => 'active']);
    $guardian->members()->attach($member->id);

    $request = app(TopupRequestService::class)->submit($guardian, $member, 600000, null, 'BCA', 'Wali Uji', now()->toDateString());

    $this->actingAs($admin)
        ->put(route('admin.topup-requests.approve', $request), ['bank_verified' => true])
        ->assertSessionHasErrors('approval_token');

    expect($member->fresh()->balance_cache)->toBe(0);
});

it('approves a large transfer topup with a valid supervisor PIN token', function () {
    $admin = User::role('admin')->firstOrFail();
    $treasurer = User::role('treasurer')->firstOrFail();
    $guardian = guardianForTopup();
    $member = Member::create(['member_number' => 'TRF2', 'name' => 'Anggota Transfer Dua', 'type' => 'santri', 'status' => 'active']);
    $guardian->members()->attach($member->id);

    $request = app(TopupRequestService::class)->submit($guardian, $member, 600000, null, 'BCA', 'Wali Uji', now()->toDateString());

    $this->actingAs($admin);
    $token = app(AuthorizationService::class)->issueToken($treasurer, 'topup.approve');

    $this->actingAs($admin)
        ->put(route('admin.topup-requests.approve', $request), ['bank_verified' => true, 'approval_token' => $token])
        ->assertSessionDoesntHaveErrors();

    expect($member->fresh()->balance_cache)->toBe(600000);
});

it('does not require a PIN for a transfer topup at or below the threshold', function () {
    $admin = User::role('admin')->firstOrFail();
    $guardian = guardianForTopup();
    $member = Member::create(['member_number' => 'TRF3', 'name' => 'Anggota Transfer Tiga', 'type' => 'santri', 'status' => 'active']);
    $guardian->members()->attach($member->id);

    $request = app(TopupRequestService::class)->submit($guardian, $member, 500000, null, 'BCA', 'Wali Uji', now()->toDateString());

    $this->actingAs($admin)
        ->put(route('admin.topup-requests.approve', $request), ['bank_verified' => true])
        ->assertSessionDoesntHaveErrors();
});

it('rejects submitting a topup whose proof image hash matches an already-approved request', function () {
    $admin = User::role('admin')->firstOrFail();
    $guardian = guardianForTopup();
    $memberA = Member::create(['member_number' => 'TRF4', 'name' => 'Anggota Bukti A', 'type' => 'santri', 'status' => 'active']);
    $memberB = Member::create(['member_number' => 'TRF5', 'name' => 'Anggota Bukti B', 'type' => 'santri', 'status' => 'active']);
    $guardian->members()->attach([$memberA->id, $memberB->id]);

    $proof1 = UploadedFile::fake()->image('bukti.jpg')->size(100);
    $first = app(TopupRequestService::class)->submit($guardian, $memberA, 100000, $proof1, 'BCA', 'Wali Uji', now()->toDateString());

    $this->actingAs($admin)
        ->put(route('admin.topup-requests.approve', $first), ['bank_verified' => true])
        ->assertSessionDoesntHaveErrors();

    // Bukti IDENTIK (file sama persis) dipakai lagi utk anak lain — harus ditolak.
    $proof2 = UploadedFile::fake()->image('bukti.jpg')->size(100);

    expect(fn () => app(TopupRequestService::class)->submit($guardian, $memberB, 90000, $proof2, 'BCA', 'Wali Uji', now()->toDateString()))
        ->toThrow(DomainException::class);
});

it('flags pending requests with the same amount and transfer date as a possible duplicate', function () {
    $admin = User::role('admin')->firstOrFail();
    $guardianA = guardianForTopup();
    $guardianB = guardianForTopup();
    $memberA = Member::create(['member_number' => 'TRF6', 'name' => 'Anggota Dupe A', 'type' => 'santri', 'status' => 'active']);
    $memberB = Member::create(['member_number' => 'TRF7', 'name' => 'Anggota Dupe B', 'type' => 'santri', 'status' => 'active']);
    $guardianA->members()->attach($memberA->id);
    $guardianB->members()->attach($memberB->id);

    $date = now()->toDateString();
    app(TopupRequestService::class)->submit($guardianA, $memberA, 123000, null, 'BCA', 'Pengirim A', $date);
    app(TopupRequestService::class)->submit($guardianB, $memberB, 123000, null, 'Mandiri', 'Pengirim B', $date);

    $response = $this->actingAs($admin)->get(route('admin.topup-requests.index'));

    $response->assertInertia(fn ($page) => $page
        ->has('topupRequests.data.0.is_possible_duplicate')
        ->where('topupRequests.data.0.is_possible_duplicate', true)
        ->where('topupRequests.data.1.is_possible_duplicate', true)
    );
});
