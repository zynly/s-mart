<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * REVISI-R1-v2.md §1.7 — halaman Kelola Laci: owner/admin/treasurer
 * (permission `cash.create`/`cash.update`, sama dengan modul kas yang
 * sudah ada) bisa menambah/mengubah akun kas, termasuk laci fisik
 * (`is_drawer=true`) per outlet.
 */
class StoreCashAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        $account = $this->route('cashAccount');

        return $this->user()->can($account ? 'cash.update' : 'cash.create');
    }

    public function rules(): array
    {
        $accountId = $this->route('cashAccount')?->id;

        return [
            'code' => ['required', 'string', 'max:30', Rule::unique('cash_accounts', 'code')->ignore($accountId)],
            'name' => ['required', 'string', 'max:150'],
            'type' => ['required', Rule::in(['cash', 'bank', 'ewallet'])],
            'outlet_id' => ['required', 'exists:outlets,id'],
            'bank_name' => ['nullable', 'string', 'max:100'],
            'account_number' => ['nullable', 'string', 'max:50'],
            'account_holder' => ['nullable', 'string', 'max:150'],
            'opening_balance' => ['nullable', 'integer', 'min:0'],
            'is_default' => ['boolean'],
            'is_drawer' => ['boolean'],
            'is_active' => ['boolean'],
        ];
    }
}
