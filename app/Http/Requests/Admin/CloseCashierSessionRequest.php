<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class CloseCashierSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('pos.update');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'actual_cash' => ['required', 'integer', 'min:0'],
            'reason' => ['nullable', 'string', 'max:255'],
            // Audit Fase 1 (Temuan Kritis #1): BUKAN approver_id lagi —
            // token sekali-pakai, lihat AuthorizationService::consumeToken().
            'approval_token' => ['nullable', 'string'],
        ];
    }
}
