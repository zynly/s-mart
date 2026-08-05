<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Gap G-05 (2026-08-03) — sebelumnya `ReportController::export()` hanya
 * memeriksa `requiredPermission()` yang SAMA dengan izin melihat laporan.
 * Kasir (report.view + report.print, TANPA report.export) bisa tetap
 * mengekspor Excel laporan penjualan kategori miliknya. Sekarang
 * `BaseReport::exportPermission()` (turunan otomatis dari
 * requiredPermission(), mis. report.view -> report.export) dicek eksplisit
 * di export(), terpisah dari resolve() yang hanya menggerbang akses lihat.
 */
it('rejects export for a cashier even though they can view the sales report', function () {
    $cashier = User::role('cashier')->firstOrFail();

    // Kasir tetap bisa MELIHAT laporan penjualan (kategori miliknya).
    $this->actingAs($cashier)
        ->get(route('admin.reports.show', 'sales-summary'))
        ->assertOk();

    // Tapi TIDAK boleh mengekspornya — report.view != report.export.
    $this->actingAs($cashier)
        ->post(route('admin.reports.export', 'sales-summary'), [])
        ->assertForbidden();
});

it('allows export for roles that hold the export permission for that report module', function () {
    $supervisor = User::role('supervisor')->firstOrFail();
    $admin = User::role('admin')->firstOrFail();
    $owner = User::role('owner')->firstOrFail();

    // supervisor: report.view+export+print — laporan kategori 'report.view' (mis. sales-summary) boleh diekspor.
    $this->actingAs($supervisor)
        ->post(route('admin.reports.export', 'sales-summary'), [])
        ->assertStatus(422); // 0 baris data pada DB uji kosong — bukan 403, buktinya lolos gate izin.

    foreach ([$admin, $owner] as $user) {
        $this->actingAs($user)
            ->post(route('admin.reports.export', 'sales-summary'), [])
            ->assertStatus(422);
    }
});

it('rejects export of the stock report for supervisor (stock.view+approve only, no stock.export)', function () {
    $supervisor = User::role('supervisor')->firstOrFail();

    $this->actingAs($supervisor)
        ->get(route('admin.reports.show', 'stock-summary'))
        ->assertOk();

    $this->actingAs($supervisor)
        ->post(route('admin.reports.export', 'stock-summary'), [])
        ->assertForbidden();
});

it('allows export of the stock report for warehouse (holds stock.export)', function () {
    $warehouse = User::role('warehouse')->firstOrFail();

    $response = $this->actingAs($warehouse)->post(route('admin.reports.export', 'stock-summary'), []);

    // Gate izin lolos — stock-summary punya data seeded (200/ready atau
    // 200/queued), yang penting BUKAN 403 seperti supervisor di atas.
    expect($response->status())->not->toBe(403);
});

it('marks canExport=false on the report detail page for a cashier', function () {
    $cashier = User::role('cashier')->firstOrFail();

    $this->actingAs($cashier)
        ->get(route('admin.reports.show', 'sales-summary'))
        ->assertInertia(fn ($page) => $page->where('canExport', false));
});

it('marks canExport=true on the report detail page for an owner', function () {
    $owner = User::role('owner')->firstOrFail();

    $this->actingAs($owner)
        ->get(route('admin.reports.show', 'sales-summary'))
        ->assertInertia(fn ($page) => $page->where('canExport', true));
});
