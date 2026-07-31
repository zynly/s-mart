<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('product.update');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $productId = $this->route('product')->id;

        return [
            'sku' => ['required', 'string', 'max:100', Rule::unique('products', 'sku')->ignore($productId)],
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'base_unit_id' => ['required', 'exists:units,id'],
            'description' => ['nullable', 'string'],
            'is_expirable' => ['boolean'],
            'is_consignment' => ['boolean'],
            'consignment_percent' => ['nullable', 'integer', 'min:0', 'max:100'],
            'min_stock' => ['numeric', 'min:0'],
            'max_stock' => ['nullable', 'numeric', 'gte:min_stock'],
            'is_active' => ['boolean'],
            'is_favorite' => ['boolean'],
            'is_visible_public' => ['boolean'],
            'description_public' => ['nullable', 'string'],

            'barcodes' => ['array'],
            'barcodes.*.barcode' => [
                'required', 'string', 'distinct',
                Rule::unique('product_barcodes', 'barcode')->ignore($productId, 'product_id'),
            ],
            'barcodes.*.unit_id' => ['required', 'exists:units,id'],
            'barcodes.*.is_primary' => ['boolean'],
        ];
    }
}
