<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Audit Fase 5 (Temuan Kritis): sebelumnya TIDAK ADA jalur untuk
 * membuat/mengganti PIN anggota sama sekali — hanya reset() (set ke
 * null) dan verify() yang punya endpoint. `MemberPinService::set()`
 * sudah ada sejak awal tapi tidak pernah dipanggil dari mana pun.
 */
class SetMemberPinRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('member.update');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'pin' => ['required', 'string', 'digits:6'],
        ];
    }
}
