<?php

use App\Models\Member;
use App\Models\MemberLevel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Gap G-07 (2026-08-03) — dua bagian:
 * (a) Frontend (Members/Index.tsx openEdit()) sebelumnya mereset field
 *     kelas/jurusan/tanggal lahir/HP/alamat/wali/dst. ke kosong setiap
 *     kali form edit dibuka, walau datanya sudah ada — kalau staf hanya
 *     mengubah satu field lalu langsung simpan, data lama tertimpa
 *     kosong. Diperbaiki dengan prefill dari `row` (data sekarang
 *     dikirim MemberController::index() lewat SELECT * bawaan).
 * (b) Pertahanan backend: UpdateMemberRequest sekarang memakai
 *     'sometimes' pada field opsional — field yang TIDAK dikirim sama
 *     sekali oleh client (bug frontend apa pun di masa depan) tidak akan
 *     ikut tervalidasi/masuk ke $member->update(), sehingga tidak bisa
 *     menimpa data lama jadi kosong. Field yang dikirim eksplisit kosong
 *     (string '' / null) tetap dikosongkan seperti biasa — beda perilaku
 *     yang disengaja.
 */
function fullMember(array $overrides = []): Member
{
    return Member::create(array_merge([
        'member_number' => 'REG'.random_int(10000, 99999),
        'name' => 'Anggota Lengkap',
        'type' => 'santri',
        'class_name' => 'X IPA 1',
        'major' => 'IPA',
        'entry_year' => 2024,
        'gender' => 'L',
        'birth_date' => '2008-05-10',
        'phone' => '081234567890',
        'address' => 'Jl. Contoh No. 1',
        'guardian_name' => 'Bapak Contoh',
        'guardian_phone' => '081298765432',
        'guardian_relation' => 'Ayah',
        'receivable_limit' => 0,
        'status' => 'active',
    ], $overrides));
}

it('does not wipe fields that are entirely absent from the update request', function () {
    $admin = User::role('admin')->firstOrFail();
    $member = fullMember();
    $level = MemberLevel::first();

    // Simulasi payload MINIMAL — hanya field wajib + satu field yang
    // benar-benar ingin diubah (member_level_id), TIDAK mengirim
    // phone/address/birth_date/guardian_* sama sekali.
    $this->actingAs($admin)
        ->put(route('admin.members.update', $member), [
            'name' => $member->name,
            'type' => $member->type,
            'member_level_id' => $level?->id,
        ])
        ->assertSessionDoesntHaveErrors();

    $fresh = $member->fresh();
    expect($fresh->phone)->toBe('081234567890')
        ->and($fresh->address)->toBe('Jl. Contoh No. 1')
        ->and((string) $fresh->birth_date)->toContain('2008-05-10')
        ->and($fresh->guardian_name)->toBe('Bapak Contoh')
        ->and($fresh->guardian_phone)->toBe('081298765432')
        ->and($fresh->class_name)->toBe('X IPA 1')
        ->and($fresh->major)->toBe('IPA');

    if ($level !== null) {
        expect($fresh->member_level_id)->toBe($level->id);
    }
});

it('still allows explicitly clearing a field by sending it as empty', function () {
    $admin = User::role('admin')->firstOrFail();
    $member = fullMember();

    $this->actingAs($admin)
        ->put(route('admin.members.update', $member), [
            'name' => $member->name,
            'type' => $member->type,
            'phone' => '', // sengaja dikosongkan
            'address' => $member->address,
            'guardian_name' => $member->guardian_name,
        ])
        ->assertSessionDoesntHaveErrors();

    expect($member->fresh()->phone)->toBeNull();
});

it('changing a single field via a full-form resubmit does not corrupt the rest (regression: full prefilled form)', function () {
    $admin = User::role('admin')->firstOrFail();
    $member = fullMember();

    // Setara dengan form yang sudah di-prefill penuh (openEdit() baru) lalu
    // hanya satu field yang diubah pengguna (class_name).
    $this->actingAs($admin)
        ->put(route('admin.members.update', $member), [
            'name' => $member->name,
            'nis' => $member->nis,
            'type' => $member->type,
            'class_name' => 'XI IPA 2', // diubah
            'major' => $member->major,
            'entry_year' => $member->entry_year,
            'gender' => $member->gender,
            'birth_date' => $member->birth_date->toDateString(),
            'phone' => $member->phone,
            'address' => $member->address,
            'guardian_name' => $member->guardian_name,
            'guardian_phone' => $member->guardian_phone,
            'guardian_relation' => $member->guardian_relation,
            'receivable_limit' => $member->receivable_limit,
            'status' => $member->status,
        ])
        ->assertSessionDoesntHaveErrors();

    $fresh = $member->fresh();
    expect($fresh->class_name)->toBe('XI IPA 2')
        ->and($fresh->major)->toBe('IPA')
        ->and($fresh->phone)->toBe('081234567890')
        ->and($fresh->guardian_name)->toBe('Bapak Contoh');
});

it('exposes the fields needed for edit-form prefill on the member list page, but never the PIN hash', function () {
    $admin = User::role('admin')->firstOrFail();
    fullMember(['pin' => '123456']);

    $this->actingAs($admin)
        ->get(route('admin.members.index'))
        ->assertInertia(fn ($page) => $page
            ->has('members.data.0', fn ($row) => $row
                ->has('phone')
                ->has('address')
                ->has('birth_date')
                ->has('guardian_name')
                ->has('guardian_phone')
                ->has('class_name')
                ->has('major')
                ->missing('pin')
                ->etc()
            )
        );
});
