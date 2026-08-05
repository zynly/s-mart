<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreAdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('deposit.adjust');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'member_id' => ['required', 'exists:members,id'],
            'amount' => ['required', 'integer', 'not_in:0'],
            // REVISI-R1-v2.md §6.2 — alasan wajib cukup deskriptif (bukan
            // "koreksi"/"salah input" satu-dua kata) karena ini mengubah
            // saldo anggota TANPA transaksi/uang fisik nyata.
            'reason' => ['required', 'string', 'min:20', 'max:255'],
            // §6.2 — "Simpan → dialog konfirmasi + PIN owner": pertahanan
            // berlapis di atas gate route `can:deposit.adjust` (owner
            // saja) — memastikan PIN BENAR-BENAR diverifikasi ulang untuk
            // AKSI INI, bukan sekadar sesi login owner yang mungkin
            // ditinggal terbuka. Token ditukar via AuthorizationService
            // (pola sama seperti void/ubah harga/dsb — lihat
            // SupervisorPinDialog).
            'approval_token' => ['required', 'string'],
        ];
    }
}
