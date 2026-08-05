<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class VoidSaleRequest extends FormRequest
{
    /**
     * BUKAN can('sale.void') — lihat catatan di VoidService::void() dan
     * routes/pos.php. `sale.void` hanya dimiliki owner/admin/supervisor;
     * kasir yang membatalkan nota lewat PIN supervisor tidak pernah
     * punya izin itu sendiri. Pengecekan bahwa approval_token benar-benar
     * menukar ke approver berizin sale.void dilakukan di
     * AuthorizationService::consumeToken() (dipanggil dari controller),
     * bukan di sini.
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
            // Audit Fase 1 (Temuan Kritis #1): BUKAN approver_id lagi —
            // token sekali-pakai dari AuthorizationService::issueToken(),
            // lihat consumeToken() di SaleController::void().
            'approval_token' => ['required', 'string'],
        ];
    }
}
