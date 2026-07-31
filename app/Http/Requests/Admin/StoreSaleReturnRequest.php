<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSaleReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('sale_return.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'sale_id' => ['required', 'exists:sales,id'],
            'cashier_session_id' => ['required', 'exists:cashier_sessions,id'],
            'reason' => ['required', Rule::in(['damaged', 'wrong_item', 'expired', 'customer_request', 'other'])],
            'reason_detail' => ['nullable', 'string', 'max:255'],
            'approver_id' => ['nullable', 'exists:users,id'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.sale_item_id' => ['required', 'exists:sale_items,id'],
            'items.*.qty' => ['required', 'numeric', 'min:0.001'],
            'items.*.condition' => ['required', Rule::in(['good', 'damaged'])],
            'items.*.restock' => ['required', 'boolean'],

            'refund_targets' => ['nullable', 'array'],
            'refund_targets.*.sale_payment_id' => ['required', 'exists:sale_payments,id'],
            'refund_targets.*.target' => ['required', Rule::in(['same', 'deposit', 'transfer', 'forfeited'])],
        ];
    }
}
