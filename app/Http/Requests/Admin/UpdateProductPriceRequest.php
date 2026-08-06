<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductPriceRequest extends FormRequest
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
        return [
            'outlet_id' => ['required', 'exists:outlets,id'],
            'unit_id' => ['required', 'exists:units,id'],
            'price' => ['required', 'integer', 'min:0'],
            'member_price' => ['nullable', 'integer', 'min:0'],
            // Default hari ini kalau kosong — lihat ProductController::updatePrice().
            'effective_from' => ['nullable', 'date'],
        ];
    }
}
