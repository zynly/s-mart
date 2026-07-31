<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class VoidSaleRequest extends FormRequest
{
    /**
     * BUKAN can('sale.void') — lihat catatan di VoidService::void() dan
     * routes/pos.php. `sale.void` hanya dimiliki owner/admin/supervisor;
     * kasir yang membatalkan nota lewat PIN supervisor tidak pernah
     * punya izin itu sendiri. Pengecekan bahwa approver_id benar-benar
     * berizin sale.void dilakukan di VoidService::void(), bukan di sini.
     */
    public function authorize(): bool
    {
        return $this->user()->can('sale.view');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:5', 'max:255'],
            'approver_id' => ['required', 'exists:users,id'],
        ];
    }
}
