<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('product.create');
    }

    protected function prepareForValidation(): void
    {
        $barcodes = collect($this->input('barcodes', []))
            ->filter(fn ($b) => is_array($b) && filled($b['barcode'] ?? null))
            ->map(fn ($b) => [
                'barcode' => trim((string) $b['barcode']),
                'unit_id' => $b['unit_id'] ?? $this->input('base_unit_id'),
                'is_primary' => (bool) ($b['is_primary'] ?? false),
            ])
            ->values()
            ->all();

        $this->merge(['barcodes' => $barcodes]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'sku' => ['required', 'string', 'max:100', 'unique:products,sku'],
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
            'barcodes.*.barcode' => ['required', 'string', 'max:50', 'distinct', 'unique:product_barcodes,barcode'],
            'barcodes.*.unit_id' => ['required', 'exists:units,id'],
            'barcodes.*.is_primary' => ['boolean'],

            'price' => ['required', 'array'],
            'price.outlet_id' => ['required', 'exists:outlets,id'],
            'price.unit_id' => ['required', 'exists:units,id'],
            'price.price' => ['required', 'integer', 'min:0'],
            'price.member_price' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
