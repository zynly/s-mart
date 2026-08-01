<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('setting.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:20', 'unique:accounts,code'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['asset', 'liability', 'equity', 'revenue', 'expense'])],
            'subtype' => ['nullable', 'string', 'max:100'],
            'parent_id' => ['nullable', 'exists:accounts,id'],
            'normal_balance' => ['required', Rule::in(['debit', 'credit'])],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }
}
