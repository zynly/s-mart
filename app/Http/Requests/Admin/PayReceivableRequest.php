<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class PayReceivableRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('receivable.update');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'amount' => ['required', 'integer', 'min:1'],
            'payment_method' => ['required', 'in:cash,transfer'],
            'cash_account_id' => ['nullable', 'exists:cash_accounts,id'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }
}
