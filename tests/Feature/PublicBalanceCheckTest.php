<?php

use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Audit independen (2026-08-02), Fase 6 — Temuan Tinggi: endpoint
 * publik /cek-saldo sebelumnya membuka saldo persis hanya dengan
 * nomor anggota (format sekuensial dapat ditebak). Sekarang wajib
 * faktor kedua (tanggal lahir) yang tidak bisa ditebak dari nomor.
 */
it('reveals the balance only when both member number and birth date match', function () {
    $member = Member::create([
        'member_number' => 'BAL0001',
        'name' => 'Santri Uji',
        'type' => 'santri',
        'status' => 'active',
        'birth_date' => '2010-05-17',
    ]);
    // balance_cache bukan mass-assignable (sengaja — cuma diubah lewat
    // DepositService), set langsung utk kebutuhan fixture test ini.
    $member->forceFill(['balance_cache' => 50000])->save();

    $this->post(route('cek-saldo.check'), [
        'member_number' => 'BAL0001',
        'birth_date' => '2010-05-17',
    ])->assertInertia(fn ($page) => $page->has('result')->where('result.balance', 50000));
});

it('rejects a correct member number with the wrong birth date (the enumeration vector the audit found)', function () {
    Member::create([
        'member_number' => 'BAL0002',
        'name' => 'Santri Uji Dua',
        'type' => 'santri',
        'status' => 'active',
        'birth_date' => '2011-03-01',
        'balance_cache' => 75000,
    ]);

    // Persis skenario enumerasi: nomor anggota benar/ditebak, tanggal
    // lahir ditebak sembarang — HARUS ditolak, bukan membuka saldo.
    $this->post(route('cek-saldo.check'), [
        'member_number' => 'BAL0002',
        'birth_date' => '2000-01-01',
    ])->assertInertia(fn ($page) => $page->has('error')->missing('result'));
});

it('gives the same generic error for not-found and wrong-birth-date (no enumeration signal)', function () {
    Member::create([
        'member_number' => 'BAL0003',
        'name' => 'Santri Uji Tiga',
        'type' => 'santri',
        'status' => 'active',
        'birth_date' => '2012-07-20',
    ]);

    $wrongDate = $this->post(route('cek-saldo.check'), ['member_number' => 'BAL0003', 'birth_date' => '1999-01-01']);
    $notFound = $this->post(route('cek-saldo.check'), ['member_number' => 'NOEXIST', 'birth_date' => '1999-01-01']);

    expect($wrongDate->getOriginalContent()->getData()['page']['props']['error'])
        ->toBe($notFound->getOriginalContent()->getData()['page']['props']['error']);
});
