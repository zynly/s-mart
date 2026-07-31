<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOpnameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('opname.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'outlet_id' => ['required', 'exists:outlets,id'],
            'scope' => ['required', Rule::in(['all', 'category', 'brand', 'product'])],
            'scope_ids' => ['required_unless:scope,all', 'array'],
            'scope_ids.*' => ['integer'],
            'opname_date' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }
}
