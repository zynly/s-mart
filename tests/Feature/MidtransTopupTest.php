<?php

use App\Models\Guardian;
use App\Models\Member;
use App\Models\TopupRequest;
use App\Services\Midtrans\MidtransGatewayInterface;
use App\Services\Midtrans\NullMidtransGateway;
use App\Services\TopupRequestService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Integrasi Midtrans (top-up wali) — alur "Bayar Otomatis" terpisah
 * dari transfer manual (TopupTransferVerificationTest.php). Gateway
 * di-fake lewat container binding (bukan HTTP call sungguhan) supaya
 * test tidak butuh kredensial/koneksi internet.
 */
function guardianForMidtransTopup(): Guardian
{
    return Guardian::create(['name' => 'Wali Uji Midtrans', 'phone' => '0812'.random_int(10000000, 99999999), 'password' => 'Password123', 'is_active' => true]);
}

function fakeMidtransSignature(string $orderId, string $statusCode, string $grossAmount, string $serverKey): string
{
    return hash('sha512', $orderId.$statusCode.$grossAmount.$serverKey);
}

it('creates a pending gateway topup request and returns a snap token', function () {
    $guardian = guardianForMidtransTopup();
    $member = Member::create(['member_number' => 'MDT1', 'name' => 'Anggota Midtrans Satu', 'type' => 'santri', 'status' => 'active']);
    $guardian->members()->attach($member->id);

    $response = $this->actingAs($guardian, 'guardian')
        ->postJson(route('wali.topup.midtrans'), ['member_id' => $member->id, 'amount' => 50000]);

    $response->assertOk()->assertJsonStructure(['token', 'reference']);

    $topupRequest = TopupRequest::where('member_id', $member->id)->first();
    expect($topupRequest->payment_provider)->toBe('midtrans')
        ->and($topupRequest->status)->toBe('pending')
        ->and($topupRequest->snap_token)->not->toBeNull()
        ->and($member->fresh()->balance_cache)->toBe(0);
});

it('adds balance when the webhook reports settlement with a valid signature', function () {
    config(['services.midtrans.server_key' => 'test-server-key']);

    $guardian = guardianForMidtransTopup();
    $member = Member::create(['member_number' => 'MDT2', 'name' => 'Anggota Midtrans Dua', 'type' => 'santri', 'status' => 'active']);
    $guardian->members()->attach($member->id);

    $topupRequest = app(TopupRequestService::class)->createForGateway($guardian, $member, 75000);

    $signature = fakeMidtransSignature($topupRequest->reference, '200', '75000.00', 'test-server-key');

    $this->postJson(route('midtrans.notification'), [
        'order_id' => $topupRequest->reference,
        'status_code' => '200',
        'gross_amount' => '75000.00',
        'signature_key' => $signature,
        'transaction_status' => 'settlement',
        'transaction_id' => 'midtrans-txn-1',
    ])->assertOk();

    expect($member->fresh()->balance_cache)->toBe(75000)
        ->and($topupRequest->fresh()->status)->toBe('approved')
        ->and($topupRequest->fresh()->payment_reference)->toBe('midtrans-txn-1');
});

it('rejects a webhook with an invalid signature and leaves the balance untouched', function () {
    config(['services.midtrans.server_key' => 'test-server-key']);

    $guardian = guardianForMidtransTopup();
    $member = Member::create(['member_number' => 'MDT3', 'name' => 'Anggota Midtrans Tiga', 'type' => 'santri', 'status' => 'active']);
    $guardian->members()->attach($member->id);

    $topupRequest = app(TopupRequestService::class)->createForGateway($guardian, $member, 60000);

    $this->postJson(route('midtrans.notification'), [
        'order_id' => $topupRequest->reference,
        'status_code' => '200',
        'gross_amount' => '60000.00',
        'signature_key' => 'signature-palsu',
        'transaction_status' => 'settlement',
    ])->assertForbidden();

    expect($member->fresh()->balance_cache)->toBe(0)
        ->and($topupRequest->fresh()->status)->toBe('pending');
});

it('only credits balance once when the same settlement notification is delivered twice', function () {
    config(['services.midtrans.server_key' => 'test-server-key']);

    $guardian = guardianForMidtransTopup();
    $member = Member::create(['member_number' => 'MDT4', 'name' => 'Anggota Midtrans Empat', 'type' => 'santri', 'status' => 'active']);
    $guardian->members()->attach($member->id);

    $topupRequest = app(TopupRequestService::class)->createForGateway($guardian, $member, 40000);
    $signature = fakeMidtransSignature($topupRequest->reference, '200', '40000.00', 'test-server-key');

    $payload = [
        'order_id' => $topupRequest->reference,
        'status_code' => '200',
        'gross_amount' => '40000.00',
        'signature_key' => $signature,
        'transaction_status' => 'settlement',
        'transaction_id' => 'midtrans-txn-dupe',
    ];

    $this->postJson(route('midtrans.notification'), $payload)->assertOk();
    $this->postJson(route('midtrans.notification'), $payload)->assertOk();

    expect($member->fresh()->balance_cache)->toBe(40000);
});

it('marks the request expired without touching the balance when the webhook reports expiry', function () {
    config(['services.midtrans.server_key' => 'test-server-key']);

    $guardian = guardianForMidtransTopup();
    $member = Member::create(['member_number' => 'MDT5', 'name' => 'Anggota Midtrans Lima', 'type' => 'santri', 'status' => 'active']);
    $guardian->members()->attach($member->id);

    $topupRequest = app(TopupRequestService::class)->createForGateway($guardian, $member, 30000);
    $signature = fakeMidtransSignature($topupRequest->reference, '200', '30000.00', 'test-server-key');

    $this->postJson(route('midtrans.notification'), [
        'order_id' => $topupRequest->reference,
        'status_code' => '200',
        'gross_amount' => '30000.00',
        'signature_key' => $signature,
        'transaction_status' => 'expire',
    ])->assertOk();

    expect($topupRequest->fresh()->status)->toBe('expired')
        ->and($member->fresh()->balance_cache)->toBe(0);
});

it('binds NullMidtransGateway by default so tests never call the real Midtrans API', function () {
    expect(app(MidtransGatewayInterface::class))->toBeInstanceOf(NullMidtransGateway::class);
});
