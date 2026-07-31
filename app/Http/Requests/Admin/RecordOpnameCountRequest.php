<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class RecordOpnameCountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('opname.update');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'product_id' => ['required', 'exists:products,id'],
            'physical_qty' => ['required', 'numeric', 'min:0'],
        ];
    }
}
