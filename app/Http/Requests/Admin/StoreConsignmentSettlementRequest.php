<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreConsignmentSettlementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('consignment.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'outlet_id' => ['required', 'exists:outlets,id'],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
            'commission_percent' => ['required', 'numeric', 'min:0', 'max:100'],
        ];
    }
}
