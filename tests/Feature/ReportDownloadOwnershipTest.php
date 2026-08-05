<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

uses(RefreshDatabase::class);

/**
 * Audit independen (2026-08-02), Fase 7 — Temuan Rendah: signed URL
 * unduhan laporan sebelumnya cuma butuh tanda tangan valid, TIDAK
 * terikat ke siapa yang mengekspornya — link yang bocor (screen share,
 * clipboard bersama) bisa diunduh siapa pun yang login.
 */
it('rejects downloading another user\'s exported report even with a validly-signed URL', function () {
    Storage::fake('local');
    Storage::disk('local')->put('exports/uji-laporan.xlsx', 'dummy-xlsx-content');

    $owner = User::role('owner')->firstOrFail();
    $admin = User::role('admin')->firstOrFail();

    $url = URL::temporarySignedRoute('admin.reports.download', now()->addHours(24), [
        'filename' => 'uji-laporan.xlsx',
        'user_id' => $owner->id,
    ]);

    // admin (BUKAN pengekspor asli) mendapat link ini entah bagaimana —
    // tanda tangan sah, tapi bukan miliknya.
    $this->actingAs($admin)->get($url)->assertForbidden();

    // owner (pengekspor asli) tetap bisa mengunduh normal.
    $this->actingAs($owner)->get($url)->assertOk();
});

it('still allows download for legacy signed URLs without a user_id (issued before this fix)', function () {
    Storage::fake('local');
    Storage::disk('local')->put('exports/uji-lama.xlsx', 'dummy-xlsx-content');

    $url = URL::temporarySignedRoute('admin.reports.download', now()->addHours(24), ['filename' => 'uji-lama.xlsx']);

    $admin = User::role('admin')->firstOrFail();
    $this->actingAs($admin)->get($url)->assertOk();
});
