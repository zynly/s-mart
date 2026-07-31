<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCouponRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('coupon.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'code' => ['required_if:generate_count,1', 'nullable', 'string', 'max:30', 'unique:coupons,code'],
            'generate_count' => ['nullable', 'integer', 'min:1', 'max:200'],
            'name' => ['required', 'string', 'max:150'],
            'discount_type' => ['required', Rule::in(['percent', 'amount'])],
            'discount_value' => ['required', 'integer', 'min:1'],
            'max_discount' => ['nullable', 'integer', 'min:0'],
            'min_purchase' => ['nullable', 'integer', 'min:0'],
            'valid_from' => ['required', 'date'],
            'valid_until' => ['required', 'date', 'after_or_equal:valid_from'],
            'quota' => ['required', 'integer', 'min:1'],
            'per_member_limit' => ['required', 'integer', 'min:1'],
            'member_id' => ['nullable', 'exists:members,id'],
            'excluded_product_ids' => ['nullable', 'array'],
            'excluded_product_ids.*' => ['exists:products,id'],
        ];
    }
}
