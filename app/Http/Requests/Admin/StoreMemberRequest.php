<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('member.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', 'in:santri,fasilitator,staff,public'],
            'name' => ['required', 'string', 'max:255'],
            'nis' => ['required_if:type,santri', 'nullable', 'string', 'max:30', 'unique:members,nis'],
            'member_level_id' => ['nullable', 'exists:member_levels,id'],
            'class_name' => ['nullable', 'string', 'max:30'],
            'major' => ['nullable', 'string', 'max:30'],
            'entry_year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'gender' => ['nullable', 'in:L,P'],
            'birth_date' => ['nullable', 'date'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string'],
            'guardian_name' => ['nullable', 'string', 'max:255'],
            'guardian_phone' => ['nullable', 'string', 'max:20'],
            'guardian_relation' => ['nullable', 'string', 'max:30'],
            'receivable_limit' => ['nullable', 'integer', 'min:0'],
            'daily_limit' => ['nullable', 'integer', 'min:0'],
            'weekly_limit' => ['nullable', 'integer', 'min:0'],
            'allowed_days' => ['nullable', 'array'],
            'allowed_days.*' => ['integer', 'min:1', 'max:7'],
            'blocked_categories' => ['nullable', 'array'],
            'blocked_categories.*' => ['integer', 'exists:categories,id'],
            'status' => ['nullable', 'in:active,inactive,graduated,transferred,suspended'],
            'joined_at' => ['nullable', 'date'],
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
