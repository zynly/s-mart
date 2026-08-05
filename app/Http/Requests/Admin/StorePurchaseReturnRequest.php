<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('purchase_return.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'purchase_id' => ['required', 'exists:purchases,id'],
            'return_date' => ['required', 'date'],
            'reason' => ['required', 'string', 'max:255'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.purchase_item_id' => ['required', 'exists:purchase_items,id'],
            'items.*.qty' => ['required', 'numeric', 'min:0.001'],
            // Audit Fase 3 (Temuan Kritis #3): BUKAN unit_cost dari client
            // lagi — PurchaseService::processReturn() sekarang SELALU
            // memakai purchaseItem->final_unit_cost asli, mengabaikan
            // apapun yang dikirim di sini.
        ];
    }
}
