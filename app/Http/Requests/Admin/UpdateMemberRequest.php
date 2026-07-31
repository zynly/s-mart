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

        return [
            'name' => ['required', 'string', 'max:255'],
            'nis' => ['nullable', 'string', 'max:30', Rule::unique('members', 'nis')->ignore($memberId)],
            'member_level_id' => ['nullable', 'exists:member_levels,id'],
            'type' => ['required', 'in:santri,fasilitator,staff,public'],
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
}
