<?php

use App\Models\Sale;
use App\Models\Unit;
use App\Models\User;
use App\Services\AuthorizationService;
use App\Services\SaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Audit independen (2026-08-02), Fase 1 — Temuan Kritis #1: sebelumnya
 * endpoint aksi sensitif (void, dst) hanya mengecek `User::find($approver_id)
 * ->can($permission)` dengan approver_id dikirim MENTAH dari client —
 * siapa pun bisa memalsukan approval tanpa pernah tahu PIN supervisor.
 * Perbaikan: AuthorizationService::issueToken()/consumeToken() — token
 * sekali-pakai, terikat permission + peminta, TTL pendek. Tes ini
 * memverifikasi mekanisme token itu sendiri lewat endpoint void nota
 * (PUT /pos/sales/{sale}/void), representatif untuk SEMUA endpoint yang
 * memakai pola yang sama (override harga/diskon, tutup sesi, retur/tukar).
 */
function voidableSale(array $fixture): Sale
{
    $unit = Unit::find($fixture['product']->base_unit_id);
    $price = activeBasePrice($fixture['product'], $fixture['outlet']);

    return app(SaleService::class)->complete([
        'outlet_id' => $fixture['outlet']->id,
        'cashier_session_id' => $fixture['session']->id,
        'idempotency_key' => 'test-void-token-'.uniqid(),
        'items' => [
            ['product_id' => $fixture['product']->id, 'unit_id' => $unit->id, 'qty' => 1],
        ],
        'payments' => [
            ['payment_method_id' => $fixture['paymentMethod']->id, 'amount' => $price],
        ],
    ]);
}

it('rejects void without an approval_token at all (field required)', function () {
    $fixture = posFixture();
    $sale = voidableSale($fixture);

    $this->putJson(route('pos.sales.void', $sale), ['reason' => 'uji tanpa token'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('approval_token');

    expect($sale->fresh()->status)->toBe('completed');
});

it('rejects void with a garbage/forged token string (the exploit the audit found)', function () {
    $fixture = posFixture();
    $sale = voidableSale($fixture);

    // Persis skenario eksploitasi di laporan audit: DevTools/Postman
    // mengirim nilai bebas alih-alih token asli hasil verifikasi PIN.
    $this->putJson(route('pos.sales.void', $sale), [
        'reason' => 'uji token palsu',
        'approval_token' => 'forged-token-'.$fixture['admin']->id,
    ])->assertStatus(422);

    expect($sale->fresh()->status)->toBe('completed');
});

it('voids a sale when a real token issued via PIN verification is consumed', function () {
    $fixture = posFixture();
    $sale = voidableSale($fixture);

    // Simulasikan AuthorizationOverrideController: PIN admin (pemegang
    // sale.void) sudah diverifikasi benar, token diterbitkan.
    $token = app(AuthorizationService::class)->issueToken($fixture['admin'], 'sale.void');

    $this->putJson(route('pos.sales.void', $sale), [
        'reason' => 'uji token sah',
        'approval_token' => $token,
    ])->assertStatus(302);

    $fresh = $sale->fresh();
    expect($fresh->status)->toBe('void')
        ->and($fresh->voided_by)->toBe($fixture['admin']->id);
});

it('burns the token after one use — cannot void a second sale by replaying it', function () {
    $fixture = posFixture();
    $saleOne = voidableSale($fixture);
    $saleTwo = voidableSale($fixture);

    $token = app(AuthorizationService::class)->issueToken($fixture['admin'], 'sale.void');

    $this->putJson(route('pos.sales.void', $saleOne), ['reason' => 'void pertama', 'approval_token' => $token])
        ->assertStatus(302);
    expect($saleOne->fresh()->status)->toBe('void');

    // Token yang SAMA dipakai lagi untuk nota lain — harus ditolak.
    $this->putJson(route('pos.sales.void', $saleTwo), ['reason' => 'void kedua (replay)', 'approval_token' => $token])
        ->assertStatus(422);
    expect($saleTwo->fresh()->status)->toBe('completed');
});

it('rejects a token issued for a different permission (not scoped to this action)', function () {
    $fixture = posFixture();
    $sale = voidableSale($fixture);

    // Token sah, PIN admin benar — tapi diterbitkan utk permission LAIN
    // (mis. dialog "tutup sesi kasir"), bukan sale.void.
    $token = app(AuthorizationService::class)->issueToken($fixture['admin'], 'pos.approve');

    $this->putJson(route('pos.sales.void', $sale), ['reason' => 'uji permission salah', 'approval_token' => $token])
        ->assertStatus(422);

    expect($sale->fresh()->status)->toBe('completed');
});

it('rejects a token when consumed by a different logged-in user than who requested it', function () {
    $fixture = posFixture(); // actingAs kasir1 (Kasir Satu)
    $sale = voidableSale($fixture);

    $token = app(AuthorizationService::class)->issueToken($fixture['admin'], 'sale.void');

    // Token bocor/disalin lalu dipakai dari sesi login kasir LAIN.
    $otherCashier = User::role('cashier')->where('id', '!=', $fixture['cashier']->id)->firstOrFail();
    $this->actingAs($otherCashier);

    $this->putJson(route('pos.sales.void', $sale), ['reason' => 'uji requester beda', 'approval_token' => $token])
        ->assertStatus(422);

    expect($sale->fresh()->status)->toBe('completed');
});

it('rejects a token after its short TTL has elapsed', function () {
    $fixture = posFixture();
    $sale = voidableSale($fixture);

    $token = app(AuthorizationService::class)->issueToken($fixture['admin'], 'sale.void');

    $this->travel((int) config('pos.pin_override_ttl_minutes', 2) + 1)->minutes();

    $this->putJson(route('pos.sales.void', $sale), ['reason' => 'uji token kedaluwarsa', 'approval_token' => $token])
        ->assertStatus(422);

    expect($sale->fresh()->status)->toBe('completed');
});

it('rejects a token whose approver no longer holds the required permission', function () {
    $fixture = posFixture();
    $sale = voidableSale($fixture);

    $token = app(AuthorizationService::class)->issueToken($fixture['admin'], 'sale.void');

    // Izin dicabut SETELAH token diterbitkan (mis. supervisor didemosi
    // di tengah shift) — consumeToken() harus re-verifikasi saat itu
    // juga, bukan cuma percaya token pernah sah diterbitkan. admin
    // memegang sale.void lewat ROLE (bukan permission langsung), jadi
    // yang dicabut adalah role-nya.
    $fixture['admin']->removeRole('admin');

    $this->putJson(route('pos.sales.void', $sale), ['reason' => 'uji izin dicabut', 'approval_token' => $token])
        ->assertStatus(422);

    expect($sale->fresh()->status)->toBe('completed');
});

it('rejects closing another cashier\'s open session (IDOR — Temuan Tinggi #3)', function () {
    $fixture = posFixture(); // actingAs kasir1, sesi milik kasir1

    $otherCashier = User::role('cashier')->where('id', '!=', $fixture['cashier']->id)->firstOrFail();
    $this->actingAs($otherCashier);

    $this->putJson(route('admin.cashier-session.close', $fixture['session']), ['actual_cash' => 100000])
        ->assertStatus(403);

    expect($fixture['session']->fresh()->status)->toBe('open');
});
