<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $users = User::query()
            ->with('roles:id,name')
            ->when($request->string('search')->toString(), fn ($query, $search) => $query->where(
                fn ($q) => $q->where('name', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
            ))
            ->when($request->string('role')->toString(), fn ($query, $role) => $query->whereHas(
                'roles',
                fn ($q) => $q->where('name', $role)
            ))
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Users/Index', [
            'tab' => 'users',
            'users' => $users,
            'roles' => Role::orderBy('name')->pluck('name'),
            'filters' => $request->only('search', 'role'),
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $user = User::create([
            ...$request->safe()->except(['role', 'password']),
            'password' => $request->validated('password'),
            'is_active' => $request->boolean('is_active', true),
        ]);

        $user->assignRole($request->validated('role'));

        return back()->with('success', "Pengguna {$user->name} berhasil dibuat.");
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $user->update([
            ...$request->safe()->except(['role']),
            'is_active' => $request->boolean('is_active', true),
        ]);

        $user->syncRoles([$request->validated('role')]);

        return back()->with('success', "Pengguna {$user->name} berhasil diperbarui.");
    }

    public function destroy(User $user): RedirectResponse
    {
        $user->update(['is_active' => false]);
        $user->delete();

        return back()->with('success', "Pengguna {$user->name} dinonaktifkan.");
    }

    public function resetPassword(Request $request, User $user): RedirectResponse
    {
        $request->validate(['password' => ['required', Password::defaults()]]);

        $user->update(['password' => Hash::make($request->string('password')->toString())]);

        return back()->with('success', "Password {$user->name} berhasil direset.");
    }

    public function setPin(Request $request, User $user): RedirectResponse
    {
        $request->validate(['pin' => ['required', 'digits:6']]);

        $user->update(['pin' => $request->string('pin')->toString()]);

        return back()->with('success', "PIN {$user->name} berhasil diatur.");
    }
}
