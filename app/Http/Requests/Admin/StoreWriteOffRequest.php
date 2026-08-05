<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWriteOffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('adjustment.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'outlet_id' => ['required', 'exists:outlets,id'],
            'product_id' => ['required', 'exists:products,id'],
            // Audit Fase 6 (Temuan Tinggi): sebelumnya nullable — kalau
            // kosong, WriteOffService::applyStockReduction() melewati
            // reduceLayer() TOTAL tapi tetap mencatat StockMovement
            // seolah stok berkurang ("stok fantom": laporan bilang
            // berkurang, stocks.qty & stock_layers tidak pernah berubah).
            'stock_layer_id' => ['required', 'exists:stock_layers,id'],
            'qty' => ['required', 'numeric', 'min:0.001'],
            'type' => ['required', Rule::in(['damaged', 'lost', 'expired', 'shrinkage'])],
            'reason' => ['required', 'string', 'max:255'],
        ];
    }
}
