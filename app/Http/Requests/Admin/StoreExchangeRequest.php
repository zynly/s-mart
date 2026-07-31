<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExchangeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('sale_return.create') && $this->user()->can('sale.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // Retur (barang keluar)
            'return.sale_id' => ['required', 'exists:sales,id'],
            'return.cashier_session_id' => ['required', 'exists:cashier_sessions,id'],
            'return.reason' => ['required', Rule::in(['damaged', 'wrong_item', 'expired', 'customer_request', 'other'])],
            'return.reason_detail' => ['nullable', 'string', 'max:255'],
            'return.approver_id' => ['nullable', 'exists:users,id'],
            'return.items' => ['required', 'array', 'min:1'],
            'return.items.*.sale_item_id' => ['required', 'exists:sale_items,id'],
            'return.items.*.qty' => ['required', 'numeric', 'min:0.001'],
            'return.items.*.condition' => ['required', Rule::in(['good', 'damaged'])],
            'return.items.*.restock' => ['required', 'boolean'],

            // Nota baru (barang masuk) — bentuk sama seperti CompleteSaleRequest
            'new_sale.outlet_id' => ['required', 'exists:outlets,id'],
            'new_sale.cashier_session_id' => ['required', 'exists:cashier_sessions,id'],
            'new_sale.member_id' => ['nullable', 'exists:members,id'],
            'new_sale.items' => ['required', 'array', 'min:1'],
            'new_sale.items.*.product_id' => ['required', 'exists:products,id'],
            'new_sale.items.*.unit_id' => ['required', 'exists:units,id'],
            'new_sale.items.*.qty' => ['required', 'numeric', 'min:0.001'],
            'new_sale.payments' => ['required', 'array', 'min:1'],
            'new_sale.payments.*.payment_method_id' => ['required', 'exists:payment_methods,id'],
            'new_sale.payments.*.amount' => ['required', 'integer', 'min:1'],
            'new_sale.payments.*.received_amount' => ['nullable', 'integer', 'min:0'],
            'new_sale.payments.*.reference_no' => ['nullable', 'string', 'max:100'],
            'new_sale.payments.*.pin' => ['nullable', 'string'],
        ];
    }
}
