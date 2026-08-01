<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateRolePermissionsRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(): Response
    {
        $permissions = Permission::orderBy('name')->pluck('name');

        $modules = $permissions
            ->map(fn (string $name) => str_contains($name, '.') ? explode('.', $name, 2)[0] : $name)
            ->unique()
            ->sort()
            ->values();

        $roles = Role::orderBy('name')->get()->map(fn (Role $role) => [
            'id' => $role->id,
            'name' => $role->name,
            'permissions' => $role->permissions->pluck('name'),
        ]);

        return Inertia::render('Admin/Roles/Index', [
            'tab' => 'roles',
            'roles' => $roles,
            'modules' => $modules,
            'actions' => ['view', 'create', 'update', 'delete', 'approve', 'export', 'print'],
            'allPermissions' => $permissions,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate(['name' => ['required', 'string', 'max:255', 'unique:roles,name']]);

        Role::create(['name' => $request->string('name')->toString()]);

        return back()->with('success', 'Role baru berhasil dibuat.');
    }

    public function update(UpdateRolePermissionsRequest $request, Role $role): RedirectResponse
    {
        // Temuan audit keamanan: sebelumnya tidak ada pengecekan sama
        // sekali — role apa pun (termasuk admin, yang tidak punya 6
        // permission eksklusif owner) bisa syncPermissions() apa saja,
        // termasuk memberi dirinya sendiri izin yang dia sendiri tidak
        // punya. Aturan umum: aktor tidak bisa memberi izin yang dia
        // sendiri tidak pegang — otomatis cover permission baru di masa
        // depan tanpa hardcode daftar. Role "owner" sendiri cuma boleh
        // diedit oleh pemegang role owner (pertahanan berlapis).
        $requested = $request->validated('permissions', []);
        $actor = $request->user();

        if ($role->name === 'owner' && ! $actor->hasRole('owner')) {
            throw ValidationException::withMessages(['permissions' => 'Hanya owner yang boleh mengubah izin role owner.']);
        }

        $notOwned = array_values(array_filter($requested, fn (string $perm) => ! $actor->can($perm)));

        if ($notOwned !== []) {
            throw ValidationException::withMessages([
                'permissions' => 'Tidak bisa memberikan izin yang Anda sendiri tidak miliki: '.implode(', ', $notOwned),
            ]);
        }

        $role->syncPermissions($requested);

        return back()->with('success', "Izin role \"{$role->name}\" berhasil diperbarui.");
    }
}
