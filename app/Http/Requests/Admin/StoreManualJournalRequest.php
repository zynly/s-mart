<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreManualJournalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('journal.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'journal_date' => ['required', 'date'],
            'type' => ['nullable', Rule::in(['general', 'sales', 'purchase', 'cash', 'adjustment', 'closing', 'reversing'])],
            'description' => ['required', 'string', 'max:255'],
            'outlet_id' => ['nullable', 'exists:outlets,id'],
            'entries' => ['required', 'array', 'min:2'],
            'entries.*.account_code' => ['required', 'exists:accounts,code'],
            'entries.*.debit' => ['required', 'integer', 'min:0'],
            'entries.*.credit' => ['required', 'integer', 'min:0'],
            'entries.*.description' => ['nullable', 'string', 'max:255'],
        ];
    }
}
