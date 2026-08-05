<?php

use App\Models\Member;
use App\Models\PaymentMethod;
use App\Models\User;
use App\Services\DepositService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * REVISI-R1-v2.md §6.2 — Riwayat Penyesuaian Saldo (tab terpisah,
 * prioritas khusus): daftar HANYA berisi transaksi type=adjustment,
 * bisa difilter per anggota/tanggal, dan bisa diekspor ke Excel.
 */
it('only lists adjustment-type transactions in the dedicated adjustments tab data, not topup/withdrawal', function () {
    $owner = User::role('owner')->firstOrFail();
    $member = Member::create(['member_number' => 'HIST1', 'name' => 'Anggota Riwayat', 'type' => 'santri', 'status' => 'active']);

    $this->actingAs($owner);
    $paymentMethod = PaymentMethod::where('type', 'cash')->firstOrFail();
    app(DepositService::class)->topup($member, 50000, $paymentMethod->id, 'topup-key-'.uniqid());
    app(DepositService::class)->adjust($member, 10000, 'Koreksi kesalahan input saldo top-up minggu lalu', $owner, 'adj-key-'.uniqid());

    $response = $this->actingAs($owner)->get(route('admin.deposit.index'));

    $response->assertInertia(fn ($page) => $page
        ->has('adjustments.data', 1)
        ->where('adjustments.data.0.amount', 10000)
    );
});

it('filters adjustment history by member', function () {
    $owner = User::role('owner')->firstOrFail();
    $memberA = Member::create(['member_number' => 'HIST2', 'name' => 'Anggota A', 'type' => 'santri', 'status' => 'active']);
    $memberB = Member::create(['member_number' => 'HIST3', 'name' => 'Anggota B', 'type' => 'santri', 'status' => 'active']);

    $this->actingAs($owner);
    app(DepositService::class)->adjust($memberA, 5000, 'Koreksi kesalahan input saldo top-up minggu lalu', $owner, 'adj-a-'.uniqid());
    app(DepositService::class)->adjust($memberB, 7000, 'Koreksi kesalahan input saldo top-up minggu lalu juga', $owner, 'adj-b-'.uniqid());

    $response = $this->actingAs($owner)->get(route('admin.deposit.index', ['member_adj' => $memberA->id]));

    $response->assertInertia(fn ($page) => $page
        ->has('adjustments.data', 1)
        ->where('adjustments.data.0.amount', 5000)
    );
});

it('exports adjustment history as an Excel file', function () {
    $owner = User::role('owner')->firstOrFail();
    $member = Member::create(['member_number' => 'HIST4', 'name' => 'Anggota Ekspor', 'type' => 'santri', 'status' => 'active']);

    $this->actingAs($owner);
    app(DepositService::class)->adjust($member, 8000, 'Koreksi kesalahan input saldo top-up minggu lalu', $owner, 'adj-exp-'.uniqid());

    $response = $this->actingAs($owner)->get(route('admin.deposit.adjustments.export'));

    $response->assertOk();
    expect($response->headers->get('Content-Disposition'))->toContain('.xlsx');
});

it('blocks a role without deposit.view from exporting adjustment history', function () {
    $cashierRole = User::role('cashier')->first();

    if ($cashierRole === null) {
        $this->markTestSkipped('No cashier user seeded.');
    }

    // cashier tetap punya deposit.view (topup/deposit view di seeder) —
    // gunakan role tanpa modul deposit sama sekali: warehouse.
    $warehouse = User::role('warehouse')->firstOrFail();

    $this->actingAs($warehouse)
        ->get(route('admin.deposit.adjustments.export'))
        ->assertForbidden();
});
