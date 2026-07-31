<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class OpenCashierSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('pos.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'cash_account_id' => ['required', 'exists:cash_accounts,id'],
            'opening_cash' => ['required', 'integer', 'min:0'],
        ];
    }
}
