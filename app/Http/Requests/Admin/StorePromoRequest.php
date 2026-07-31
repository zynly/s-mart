<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePromoRequest extends FormRequest
{
    public function authorize(): bool
    {
        $promo = $this->route('promo');

        return $this->user()->can($promo ? 'promo.update' : 'promo.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $promoId = $this->route('promo')?->id;

        return [
            'code' => ['required', 'string', 'max:30', Rule::unique('promos', 'code')->ignore($promoId)],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'type' => ['required', Rule::in(['product', 'category', 'member_level', 'bundle', 'buy_x_get_y', 'tiered_qty', 'happy_hour', 'clearance', 'birthday'])],
            'scope' => ['required', Rule::in(['item', 'bill'])],
            'discount_type' => ['required', Rule::in(['percent', 'amount', 'fixed_price', 'free_item'])],
            'discount_value' => ['required', 'integer', 'min:0'],
            'max_discount' => ['nullable', 'integer', 'min:0'],
            'min_purchase' => ['nullable', 'integer', 'min:0'],
            'min_qty' => ['nullable', 'numeric', 'min:0'],
            'buy_qty' => ['nullable', 'numeric', 'min:0', 'required_if:type,buy_x_get_y'],
            'get_qty' => ['nullable', 'numeric', 'min:0', 'required_if:type,buy_x_get_y'],
            'get_product_id' => ['nullable', 'exists:products,id'],
            'tiers' => ['nullable', 'array'],
            'tiers.*.min_qty' => ['required_with:tiers', 'numeric', 'min:0'],
            'tiers.*.discount' => ['required_with:tiers', 'numeric', 'min:0'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'days_of_week' => ['nullable', 'array'],
            'days_of_week.*' => ['integer', 'between:1,7'],
            'quota_total' => ['nullable', 'integer', 'min:1'],
            'quota_per_member' => ['nullable', 'integer', 'min:1'],
            'priority' => ['nullable', 'integer'],
            'is_stackable' => ['boolean'],
            'is_public' => ['boolean'],
            'is_active' => ['boolean'],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['exists:products,id'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['exists:categories,id'],
        ];
    }
}
