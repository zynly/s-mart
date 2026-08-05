<?php

use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\User;
use App\Services\AuthorizationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/**
 * REVISI-R1-v2.md §6.3 (Jalur A) — top-up TUNAI di atas ambang wajib
 * PIN supervisor, di atas pengaman rekonsiliasi kas saat tutup sesi.
 */
function topupPayload(array $overrides = []): array
{
    $outlet = Outlet::first();
    $member = Member::create(['member_number' => 'TU'.uniqid(), 'name' => 'Anggota Topup', 'type' => 'santri', 'status' => 'active']);
    $cash = PaymentMethod::where('type', 'cash')->firstOrFail();

    return array_merge([
        'member_id' => $member->id,
        'amount' => 50000,
        'payment_method_id' => $cash->id,
        'outlet_id' => $outlet->id,
    ], $overrides);
}

it('rejects a large cash topup without a supervisor PIN token', function () {
    $cashier = User::role('cashier')->firstOrFail();

    $this->actingAs($cashier)
        ->withHeaders(['X-Idempotency-Key' => (string) Str::uuid()])
        ->post(route('admin.deposit.topup'), topupPayload(['amount' => 250000]))
        ->assertSessionHasErrors('approval_token');
});

it('allows a large cash topup with a valid approver PIN token (topup.approve holder)', function () {
    $cashier = User::role('cashier')->firstOrFail();
    $treasurer = User::role('treasurer')->firstOrFail();

    // Token diterbitkan dalam KONTEKS SESI KASIR (persis alur nyata:
    // kasir tetap login, supervisor/treasurer cuma ketik PIN di dialog
    // — requester_id terikat ke siapa yang sedang login di browser,
    // approver_id ke pemilik PIN yang cocok). Lihat AuthorizationService::
    // issueToken()/consumeToken().
    $this->actingAs($cashier);
    $token = app(AuthorizationService::class)->issueToken($treasurer, 'topup.approve');

    $this->actingAs($cashier)
        ->withHeaders(['X-Idempotency-Key' => (string) Str::uuid()])
        ->post(route('admin.deposit.topup'), topupPayload(['amount' => 250000, 'approval_token' => $token]))
        ->assertSessionDoesntHaveErrors();
});

it('rejects a forged/garbage PIN token for a large cash topup', function () {
    $cashier = User::role('cashier')->firstOrFail();

    $this->actingAs($cashier)
        ->withHeaders(['X-Idempotency-Key' => (string) Str::uuid()])
        ->post(route('admin.deposit.topup'), topupPayload(['amount' => 250000, 'approval_token' => 'forged-garbage-token']))
        ->assertSessionHasErrors('approval_token');
});

it('does not require a PIN for a cash topup at or below the threshold', function () {
    $cashier = User::role('cashier')->firstOrFail();

    $this->actingAs($cashier)
        ->withHeaders(['X-Idempotency-Key' => (string) Str::uuid()])
        ->post(route('admin.deposit.topup'), topupPayload(['amount' => 200000]))
        ->assertSessionDoesntHaveErrors();
});
