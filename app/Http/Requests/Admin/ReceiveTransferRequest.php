<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ReceiveTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('transfer.update');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.stock_transfer_item_id' => ['required', 'exists:stock_transfer_items,id'],
            'items.*.qty_received' => ['required', 'numeric', 'min:0'],
        ];
    }
}
