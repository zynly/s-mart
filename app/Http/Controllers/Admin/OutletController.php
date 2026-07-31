<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Outlet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OutletController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Outlets/Index', [
            'outlets' => Outlet::orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:outlets,code'],
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:20'],
            'is_main' => ['boolean'],
            'is_active' => ['boolean'],
        ]);

        Outlet::create($data);

        return back()->with('success', 'Outlet berhasil dibuat.');
    }

    public function update(Request $request, Outlet $outlet): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('outlets', 'code')->ignore($outlet->id)],
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:20'],
            'is_main' => ['boolean'],
            'is_active' => ['boolean'],
        ]);

        $outlet->update($data);

        return back()->with('success', 'Outlet berhasil diperbarui.');
    }

    public function destroy(Outlet $outlet): RedirectResponse
    {
        $outlet->update(['is_active' => false]);

        return back()->with('success', 'Outlet dinonaktifkan.');
    }
}
