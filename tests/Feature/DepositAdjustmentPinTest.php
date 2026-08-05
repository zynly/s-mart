<?php

use App\Models\Member;
use App\Models\User;
use App\Services\AuthorizationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/**
 * REVISI-R1-v2.md §6.2 — Penyesuaian Saldo: alasan wajib minimal 20
 * karakter, dan simpan wajib token PIN owner (bukan cukup sesi login
 * owner yang sedang aktif) — pola sama dengan void/ubah harga (lihat
 * AuthorizationService::consumeToken()).
 */
it('rejects an adjustment reason shorter than 20 characters', function () {
    $owner = User::role('owner')->firstOrFail();
    $member = Member::create(['member_number' => 'ADJ1', 'name' => 'Anggota Uji', 'type' => 'santri', 'status' => 'active']);
    $token = app(AuthorizationService::class)->issueToken($owner, 'deposit.adjust');

    $this->actingAs($owner)
        ->withHeaders(['X-Idempotency-Key' => (string) Str::uuid()])
        ->post(route('admin.deposit.adjustment'), [
            'member_id' => $member->id,
            'amount' => 10000,
            'reason' => 'salah input',
            'approval_token' => $token,
        ])
        ->assertSessionHasErrors('reason');
});

it('rejects saving an adjustment without a valid PIN approval token', function () {
    $owner = User::role('owner')->firstOrFail();
    $member = Member::create(['member_number' => 'ADJ2', 'name' => 'Anggota Uji Dua', 'type' => 'santri', 'status' => 'active']);

    $this->actingAs($owner)
        ->withHeaders(['X-Idempotency-Key' => (string) Str::uuid()])
        ->post(route('admin.deposit.adjustment'), [
            'member_id' => $member->id,
            'amount' => 10000,
            'reason' => 'Koreksi kesalahan input saldo top-up minggu lalu',
            'approval_token' => 'token-palsu-sembarangan',
        ])
        ->assertSessionHasErrors('approval_token');

    expect($member->fresh()->balance_cache)->toBe(0);
});

it('applies the adjustment when reason is descriptive and the PIN token is valid', function () {
    $owner = User::role('owner')->firstOrFail();
    $member = Member::create(['member_number' => 'ADJ3', 'name' => 'Anggota Uji Tiga', 'type' => 'santri', 'status' => 'active']);
    // Token terikat ke requester (auth()->id() SAAT diterbitkan) — harus
    // login sebagai owner DULU sebelum issueToken(), sama seperti alur
    // nyata (dialog PIN muncul setelah owner sudah login).
    $this->actingAs($owner);
    $token = app(AuthorizationService::class)->issueToken($owner, 'deposit.adjust');

    $this->actingAs($owner)
        ->withHeaders(['X-Idempotency-Key' => (string) Str::uuid()])
        ->post(route('admin.deposit.adjustment'), [
            'member_id' => $member->id,
            'amount' => 15000,
            'reason' => 'Koreksi kesalahan input saldo top-up minggu lalu',
            'approval_token' => $token,
        ])
        ->assertSessionDoesntHaveErrors();

    expect($member->fresh()->balance_cache)->toBe(15000);
});
