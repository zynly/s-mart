<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateRolePermissionsRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        $role->syncPermissions($request->validated('permissions', []));

        return back()->with('success', "Izin role \"{$role->name}\" berhasil diperbarui.");
    }
}
