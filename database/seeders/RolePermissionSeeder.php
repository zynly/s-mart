<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    /**
     * 34 modul inti aplikasi (lihat CONTEXT.md § Aktor,
     * PROMPT-POS-SKILLAGE-MART.md § Fase 1 bagian 3).
     */
    private const MODULES = [
        'user', 'role', 'outlet', 'category', 'product', 'unit', 'brand', 'supplier',
        'member', 'card', 'deposit', 'topup', 'withdrawal', 'pos', 'sale', 'sale_return',
        'purchase', 'purchase_order', 'purchase_return', 'consignment', 'stock', 'opname',
        'transfer', 'adjustment', 'promo', 'coupon', 'cash', 'debt', 'receivable',
        'journal', 'ledger', 'report', 'setting', 'backup',
    ];

    private const ACTIONS = ['view', 'create', 'update', 'delete', 'approve', 'export', 'print'];

    /**
     * Permission khusus di luar pola modul.aksi (lihat ADR-0005 untuk
     * receivable.delete — bukan receivable.write_off).
     */
    private const SPECIAL_PERMISSIONS = [
        'sale.void',
        'sale.change_price',
        'sale.discount_over_limit',
        'product.view_cost',
        'deposit.adjust',
        'receivable.delete',
        'period.close',
        'system.reset',
    ];

    public function run(): void
    {
        $this->createPermissions();
        $this->createRoles();
    }

    private function createPermissions(): void
    {
        foreach (self::MODULES as $module) {
            foreach (self::ACTIONS as $action) {
                Permission::firstOrCreate(['name' => "{$module}.{$action}"]);
            }
        }

        foreach (self::SPECIAL_PERMISSIONS as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }
    }

    private function createRoles(): void
    {
        $owner = Role::firstOrCreate(['name' => 'owner']);
        $owner->syncPermissions(Permission::all());

        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->syncPermissions(
            Permission::all()->reject(fn (Permission $p) => in_array($p->name, [
                'receivable.delete',
                'deposit.adjust',
                'period.close',
                'system.reset',
                'product.view_cost',
            ], true))
        );

        $supervisor = Role::firstOrCreate(['name' => 'supervisor']);
        $supervisor->syncPermissions([
            ...$this->permissionsFor(['pos', 'sale'], self::ACTIONS),
            ...$this->permissionsFor(['product', 'member', 'card', 'cash'], ['view']),
            ...$this->permissionsFor(['stock', 'opname', 'adjustment'], ['view', 'approve']),
            ...$this->permissionsFor(['report'], ['view', 'export', 'print']),
            'sale.void',
            'sale.change_price',
            'sale.discount_over_limit',
        ]);

        $cashier = Role::firstOrCreate(['name' => 'cashier']);
        $cashier->syncPermissions([
            ...$this->permissionsFor(['pos', 'sale'], ['view', 'create']),
            ...$this->permissionsFor(['sale_return'], ['view', 'create']),
            ...$this->permissionsFor(['topup', 'deposit'], ['view', 'create']),
            ...$this->permissionsFor(['member', 'card', 'product', 'stock', 'promo', 'coupon'], ['view']),
            ...$this->permissionsFor(['cash'], ['view', 'create']),
            ...$this->permissionsFor(['report'], ['view', 'print']),
        ]);

        $warehouse = Role::firstOrCreate(['name' => 'warehouse']);
        $warehouse->syncPermissions([
            ...$this->permissionsFor(['product', 'category', 'unit', 'brand', 'supplier'], self::ACTIONS),
            ...$this->permissionsFor(['stock', 'opname', 'transfer', 'adjustment'], self::ACTIONS),
            ...$this->permissionsFor(['purchase', 'purchase_order', 'purchase_return', 'consignment'], self::ACTIONS),
            ...$this->permissionsFor(['report'], ['view', 'export', 'print']),
        ]);

        $treasurer = Role::firstOrCreate(['name' => 'treasurer']);
        $treasurer->syncPermissions([
            ...$this->permissionsFor(['cash', 'debt', 'receivable', 'journal', 'ledger'], self::ACTIONS),
            ...$this->permissionsFor(['stock', 'member', 'sale', 'purchase'], ['view']),
            ...$this->permissionsFor(['report'], self::ACTIONS),
        ]);
    }

    /**
     * @param  string[]  $modules
     * @param  string[]  $actions
     * @return string[]
     */
    private function permissionsFor(array $modules, array $actions): array
    {
        $names = [];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                $names[] = "{$module}.{$action}";
            }
        }

        return $names;
    }
}
