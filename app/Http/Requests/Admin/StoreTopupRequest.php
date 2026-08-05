<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreTopupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('topup.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'member_id' => ['required', 'exists:members,id'],
            'amount' => ['required', 'integer', 'min:'.config('pos.deposit_min_topup', 10000)],
            'payment_method_id' => ['required', 'exists:payment_methods,id'],
            'outlet_id' => ['required', 'exists:outlets,id'],
            // REVISI-R1-v2.md §6.3 — wajib diisi hanya bila top-up TUNAI
            // melebihi ambang (dicek di controller, butuh tipe metode
            // bayar yang baru diketahui setelah query).
            'approval_token' => ['nullable', 'string'],
        ];
    }
}
