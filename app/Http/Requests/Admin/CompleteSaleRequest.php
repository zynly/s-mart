<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class CompleteSaleRequest extends FormRequest
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
            'member_card_id' => ['nullable', 'exists:member_cards,id'],
            'bill_discount' => ['nullable', 'integer', 'min:0'],
            // Audit Fase 1 (Temuan Kritis #1): BUKAN discount_approver_id/
            // price_override_approver_id lagi (ID mentah dari client, bisa
            // dipalsukan) — token sekali-pakai dari AuthorizationService::
            // issueToken(), ditukar server-side di SaleService::complete().
            'discount_approval_token' => ['nullable', 'string'],
            'coupon_code' => ['nullable', 'string', 'max:30'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.unit_id' => ['required', 'exists:units,id'],
            'items.*.qty' => ['required', 'numeric', 'min:0.001'],
            'items.*.price_override' => ['nullable', 'integer', 'min:0'],
            'price_override_approval_token' => ['nullable', 'string'],

            'payments' => ['required', 'array', 'min:1'],
            'payments.*.payment_method_id' => ['required', 'exists:payment_methods,id'],
            'payments.*.amount' => ['required', 'integer', 'min:1'],
            'payments.*.received_amount' => ['nullable', 'integer', 'min:0'],
            'payments.*.reference_no' => ['nullable', 'string', 'max:100'],
            'payments.*.pin' => ['nullable', 'string'],
            'payments.*.point_used' => ['nullable', 'integer', 'min:1'],
            // Audit Fase 6 (Temuan Sedang): sebelumnya CreditHandler
            // mengecek `$payload['approver']` sebagai truthy-check MENTAH
            // (tidak divalidasi di sini sama sekali, dan kalaupun terisi
            // tidak pernah dicek permission) — dead code yang berisiko
            // jadi bypass limit piutang kalau "diperbaiki" asal-asalan.
            // Token sekali-pakai, pola sama seperti override lain.
            'payments.*.credit_approval_token' => ['nullable', 'string'],
        ];
    }
}
