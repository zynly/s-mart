<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class TransferCashRequest extends FormRequest
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
            'from_account_id' => ['required', 'exists:cash_accounts,id'],
            'to_account_id' => ['required', 'exists:cash_accounts,id', 'different:from_account_id'],
            'amount' => ['required', 'integer', 'min:1'],
        ];
    }
}
