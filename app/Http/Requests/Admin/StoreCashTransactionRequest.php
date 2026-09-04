<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreCashTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('cash.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'cash_account_id' => ['required', 'exists:cash_accounts,id'],
            'cash_category_id' => ['nullable', 'exists:cash_categories,id'],
            'amount' => ['required', 'integer', 'min:1'],
            'description' => ['required', 'string', 'max:255'],
            'pin' => ['nullable', 'string'],
            'is_pos' => ['nullable', 'boolean'],
        ];
    }
}
