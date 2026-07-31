<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('purchase.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'outlet_id' => ['required', 'exists:outlets,id'],
            'purchase_order_id' => ['nullable', 'exists:purchase_orders,id'],
            'invoice_no' => ['nullable', 'string', 'max:50'],
            'purchase_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:purchase_date'],
            'type' => ['required', 'in:regular,consignment'],
            'payment_type' => ['required_if:type,regular', 'in:cash,credit'],
            'discount' => ['nullable', 'integer', 'min:0'],
            'tax' => ['nullable', 'integer', 'min:0'],
            'note' => ['nullable', 'string'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.unit_id' => ['required', 'exists:units,id'],
            'items.*.qty' => ['required', 'numeric', 'min:0.001'],
            'items.*.unit_price' => ['required', 'integer', 'min:0'],
            'items.*.discount' => ['nullable', 'integer', 'min:0'],
            'items.*.batch_no' => ['nullable', 'string', 'max:50'],
            'items.*.expired_at' => ['nullable', 'date'],

            'other_costs' => ['nullable', 'array'],
            'other_costs.*.name' => ['required_with:other_costs', 'string', 'max:100'],
            'other_costs.*.amount' => ['required_with:other_costs', 'integer', 'min:0'],
        ];
    }
}
