<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('purchase_return.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'purchase_id' => ['required', 'exists:purchases,id'],
            'return_date' => ['required', 'date'],
            'reason' => ['required', 'string', 'max:255'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.purchase_item_id' => ['required', 'exists:purchase_items,id'],
            'items.*.qty' => ['required', 'numeric', 'min:0.001'],
            'items.*.unit_cost' => ['required', 'integer', 'min:0'],
        ];
    }
}
