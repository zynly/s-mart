<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('transfer.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'from_outlet_id' => ['required', 'exists:outlets,id', 'different:to_outlet_id'],
            'to_outlet_id' => ['required', 'exists:outlets,id'],
            'transfer_date' => ['nullable', 'date'],
            'expected_arrival' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:255'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.qty' => ['required', 'numeric', 'min:0.001'],
        ];
    }
}
