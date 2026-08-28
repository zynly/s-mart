<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('member.update');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $memberId = $this->route('member')->id;

        // Gap G-07: sebelumnya semua field opsional dipakai 'nullable' polos
        // — kalau frontend gagal mengirim sebuah field (mis. bug prefill),
        // Laravel tetap menyertakannya sebagai null di validated() dan
        // MemberService::update() menimpanya jadi KOSONG. 'sometimes'
        // membuat validated() HANYA berisi field yang benar-benar dikirim
        // client — field yang tidak dikirim sama sekali tidak disentuh
        // $member->update(), sementara field yang dikirim KOSONG (string
        // '' / null secara sengaja) tetap dikosongkan seperti biasa. Ini
        // pertahanan berlapis di backend, terlepas dari perbaikan prefill
        // di frontend (Members/Index.tsx openEdit()).
        return [
            'type' => ['required', 'in:santri,fasilitator,staff,public'],
            'name' => ['required', 'string', 'max:255'],
            'nis' => ['sometimes', 'required_if:type,santri', 'nullable', 'string', 'max:30', Rule::unique('members', 'nis')->ignore($memberId)],
            'member_level_id' => ['sometimes', 'nullable', 'exists:member_levels,id'],
            'class_name' => ['sometimes', 'nullable', 'string', 'max:30'],
            'major' => ['sometimes', 'nullable', 'string', 'max:30'],
            'entry_year' => ['sometimes', 'nullable', 'integer', 'min:2000', 'max:2100'],
            'gender' => ['sometimes', 'nullable', 'in:L,P'],
            'birth_date' => ['sometimes', 'nullable', 'date'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'address' => ['sometimes', 'nullable', 'string'],
            'guardian_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'guardian_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'guardian_relation' => ['sometimes', 'nullable', 'string', 'max:30'],
            'receivable_limit' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'daily_limit' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'weekly_limit' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'allowed_days' => ['sometimes', 'nullable', 'array'],
            'allowed_days.*' => ['integer', 'min:1', 'max:7'],
            'blocked_categories' => ['sometimes', 'nullable', 'array'],
            'blocked_categories.*' => ['integer', 'exists:categories,id'],
            'status' => ['sometimes', 'nullable', 'in:active,inactive,graduated,transferred,suspended'],
            'joined_at' => ['sometimes', 'nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'nis.required_if' => 'NIS wajib diisi untuk anggota dengan tipe Santri.',
            'nis.unique' => 'NIS ini sudah digunakan oleh anggota lain.',
        ];
    }
}
