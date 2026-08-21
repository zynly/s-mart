<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PaymentMethodController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/PaymentMethods/Index', [
            'tab' => 'payment-methods',
            'paymentMethods' => PaymentMethod::orderBy('sort_order')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:payment_methods,code'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['cash', 'card', 'qris', 'ewallet', 'transfer', 'deposit', 'credit'])],
            'mdr_percent' => ['numeric', 'min:0', 'max:100'],
            'requires_reference' => ['boolean'],
            'allows_change' => ['boolean'],
            'sort_order' => ['integer'],
            'is_active' => ['boolean'],
        ]);

        PaymentMethod::create($data);

        return back()->with('success', 'Metode bayar berhasil dibuat.');
    }

    public function update(Request $request, PaymentMethod $paymentMethod): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('payment_methods', 'code')->ignore($paymentMethod->id)],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['cash', 'card', 'qris', 'ewallet', 'transfer', 'deposit', 'credit'])],
            'mdr_percent' => ['numeric', 'min:0', 'max:100'],
            'requires_reference' => ['boolean'],
            'allows_change' => ['boolean'],
            'sort_order' => ['integer'],
            'is_active' => ['boolean'],
        ]);

        $paymentMethod->update($data);

        return back()->with('success', 'Metode bayar berhasil diperbarui.');
    }

    public function destroy(PaymentMethod $paymentMethod): RedirectResponse
    {
        $paymentMethod->update(['is_active' => false]);

        return back()->with('success', 'Metode bayar dinonaktifkan.');
    }
}
