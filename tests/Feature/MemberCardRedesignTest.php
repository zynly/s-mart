<?php

use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * REVISI-R1-v2.md §9 — desain ulang kartu member (Opsi A, navy
 * #07395A, dikonfirmasi pemilik toko). Test ini murni smoke-test
 * render PDF (dompdf benar-benar bisa memproses template baru tanpa
 * error) + gating akses — bukan verifikasi visual pixel-perfect
 * (di luar kemampuan Pest, perlu tinjauan manual, dicatat di laporan
 * akhir sebagai bagian yang masih perlu verifikasi manusia).
 */
it('renders a single-card PDF preview for a member with an active card', function () {
    $admin = User::role('admin')->firstOrFail();
    $member = Member::first();
    expect($member)->not->toBeNull(); // MemberSeeder membuat member + kartu aktif

    $response = $this->actingAs($admin)->get(route('admin.members.preview-card', $member));

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toContain('application/pdf');
});

it('still renders the bulk print PDF for multiple members with the redesigned template', function () {
    $admin = User::role('admin')->firstOrFail();
    $members = Member::limit(2)->get();

    $response = $this->actingAs($admin)
        ->get(route('admin.members.print-cards', ['ids' => $members->pluck('id')->all()]));

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toContain('application/pdf');
});

it('blocks a role without member.print from previewing a card', function () {
    $cashier = User::role('cashier')->firstOrFail();
    $member = Member::first();

    $this->actingAs($cashier)
        ->get(route('admin.members.preview-card', $member))
        ->assertForbidden();
});
