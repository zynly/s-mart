<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Temuan audit keamanan (Phase B): SaleController::hold() sebelumnya
 * memakai $request->all() mentah — item non-array bisa memicu
 * TypeError 500, cashier_session_id sembarang bisa dipakai (ditutup di
 * SaleService::hold() lewat cek kepemilikan sesi).
 */
class HoldSaleRequest extends FormRequest
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

            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.unit_id' => ['required', 'exists:units,id'],
            'items.*.qty' => ['required', 'numeric', 'min:0.001'],
            'items.*.unit_price' => ['nullable', 'integer', 'min:0'],
            'items.*.product_name' => ['nullable', 'string', 'max:255'],
            'items.*.unit_code' => ['nullable', 'string', 'max:20'],
        ];
    }
}
