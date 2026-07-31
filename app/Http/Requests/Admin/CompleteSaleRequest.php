<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class CompleteSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('sale.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'outlet_id' => ['required', 'exists:outlets,id'],
            'cashier_session_id' => ['required', 'exists:cashier_sessions,id'],
            'member_id' => ['nullable', 'exists:members,id'],
            'member_card_id' => ['nullable', 'exists:member_cards,id'],
            'payment_method_id' => ['required', 'exists:payment_methods,id'],
            'paid_amount' => ['nullable', 'integer', 'min:0'],
            'bill_discount' => ['nullable', 'integer', 'min:0'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.unit_id' => ['required', 'exists:units,id'],
            'items.*.qty' => ['required', 'numeric', 'min:0.001'],
            'items.*.price_override' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
