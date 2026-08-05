<?php

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Gap G-08 (2026-08-03) — Log Aktivitas sebelumnya hanya menampilkan
 * Waktu/Pengguna/Modul/Aksi; data detail (`properties`, berisi nilai
 * sebelum/sesudah dari Spatie Activitylog) tersimpan tapi tidak pernah
 * dirender. Ditambahkan render detail di frontend (Lihat Detail) DAN
 * masking di backend (ActivityLogController::maskSensitive()) sebagai
 * pertahanan berlapis — bukan hanya mengandalkan `logExcept()` di titik
 * pencatatan tiap model.
 */
it('masks sensitive property keys (token/secret/password/pin/credential) before sending to the frontend', function () {
    $owner = User::role('owner')->firstOrFail();

    activity('Uji')
        ->withProperties([
            'api_token' => 'super-rahasia-jangan-bocor',
            'client_secret' => 'juga-rahasia',
            'reset_credential' => 'rahasia-lagi',
            'note' => 'informasi biasa, aman ditampilkan',
        ])
        ->log('Aktivitas uji dengan properti sensitif');

    $response = $this->actingAs($owner)->get(route('admin.activity-logs.index', ['log_name' => 'Uji']));

    $response->assertInertia(function ($page) {
        $page->has('logs.data.0.properties', fn ($props) => $props
            ->where('api_token', '••••••')
            ->where('client_secret', '••••••')
            ->where('reset_credential', '••••••')
            ->where('note', 'informasi biasa, aman ditampilkan')
        );
    });
});

it('still exposes normal before/after attribute changes for model updates, unmasked', function () {
    $owner = User::role('owner')->firstOrFail();
    $product = Product::where('is_active', true)->first();
    $product->update(['name' => 'Produk Diubah Untuk Uji Log']);

    $response = $this->actingAs($owner)->get(route('admin.activity-logs.index', ['log_name' => 'Product']));

    $response->assertInertia(function ($page) {
        $page->has('logs.data.0.properties.attributes', fn ($attrs) => $attrs
            ->where('name', 'Produk Diubah Untuk Uji Log')
            ->etc()
        );
    });
});

it('blocks roles without setting.view from opening the activity log', function () {
    $cashier = User::role('cashier')->firstOrFail();

    $this->actingAs($cashier)
        ->get(route('admin.activity-logs.index'))
        ->assertForbidden();
});
