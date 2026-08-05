<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePromoRequest extends FormRequest
{
    public function authorize(): bool
    {
        $promo = $this->route('promo');

        return $this->user()->can($promo ? 'promo.update' : 'promo.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $promo = $this->route('promo');
        $promoId = $promo?->id;

        return [
            'code' => ['required', 'string', 'max:30', Rule::unique('promos', 'code')->ignore($promoId)],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            // Gap G-01: 'member_level' & 'birthday' TIDAK PERNAH diterapkan
            // PromoEngine::matchesProduct() (default => false) — diskon level
            // anggota berjalan otomatis dari MemberLevel::discount_percent,
            // bonus ulang tahun dari GrantBirthdayBonus terjadwal. Nilai enum
            // DB tetap menerimanya (lihat migration promos) supaya promo lama
            // bertipe ini tidak pecah saat dibuka/dinonaktifkan, tapi TIDAK
            // BOLEH dipilih untuk promo baru atau diubah dari tipe lain.
            'type' => ['required', function (string $attribute, mixed $value, \Closure $fail) use ($promo) {
                $supported = ['product', 'category', 'bundle', 'buy_x_get_y', 'tiered_qty', 'happy_hour', 'clearance'];

                if (in_array($value, $supported, true)) {
                    return;
                }

                if (in_array($value, ['member_level', 'birthday'], true) && $promo !== null && $promo->type === $value) {
                    return;
                }

                $fail('Tipe promo ini tidak diterapkan oleh mesin diskon checkout dan tidak bisa dipilih. Diskon level anggota berjalan otomatis dari Level Keanggotaan, bonus ulang tahun berjalan dari proses terjadwal — bukan dari data Promo.');
            }],
            'scope' => ['required', Rule::in(['item', 'bill'])],
            'discount_type' => ['required', Rule::in(['percent', 'amount', 'fixed_price', 'free_item'])],
            'discount_value' => ['required', 'integer', 'min:0'],
            'max_discount' => ['nullable', 'integer', 'min:0'],
            'min_purchase' => ['nullable', 'integer', 'min:0'],
            'min_qty' => ['nullable', 'numeric', 'min:0'],
            'buy_qty' => ['nullable', 'numeric', 'min:0', 'required_if:type,buy_x_get_y'],
            'get_qty' => ['nullable', 'numeric', 'min:0', 'required_if:type,buy_x_get_y'],
            'get_product_id' => ['nullable', 'exists:products,id'],
            // Gap G-02: PromoEngine::tieredDiscountAmount() membaca `tiers`
            // (bukan `min_qty`), jadi promo tiered_qty WAJIB punya minimal
            // 1 tier — sebelumnya form web tidak pernah mengirim `tiers`
            // sama sekali untuk tipe ini (diskon selalu 0, mati total).
            'tiers' => [
                Rule::requiredIf(fn () => $this->input('type') === 'tiered_qty'),
                'nullable', 'array',
                $this->input('type') === 'tiered_qty' ? 'min:1' : 'sometimes',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if (! is_array($value) || $value === []) {
                        return;
                    }

                    $minQtys = array_map(fn ($t) => (float) ($t['min_qty'] ?? -1), $value);

                    if (count($minQtys) !== count(array_unique($minQtys))) {
                        $fail('Setiap tier harus punya Minimal Qty yang berbeda (tidak boleh duplikat).');
                    }
                },
            ],
            'tiers.*.min_qty' => ['required_with:tiers', 'numeric', 'min:0.001'],
            'tiers.*.discount' => ['required_with:tiers', 'numeric', 'min:0', 'max:100'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'days_of_week' => ['nullable', 'array'],
            'days_of_week.*' => ['integer', 'between:1,7'],
            'quota_total' => ['nullable', 'integer', 'min:1'],
            'quota_per_member' => ['nullable', 'integer', 'min:1'],
            'priority' => ['nullable', 'integer'],
            'is_stackable' => ['boolean'],
            'is_public' => ['boolean'],
            'is_active' => ['boolean'],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['exists:products,id'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['exists:categories,id'],
        ];
    }
}
