<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Request;

/**
 * T-116 (Fase UI-01). Satu sumber kebenaran navigasi — baca
 * `config/navigation.php`, saring per user, resolve route jadi URL.
 * Menyembunyikan menu SAJA bukan penegakan akses (itu tugas middleware
 * `can:` di route + `authorize()` di controller, lapis 2 & 3) — service
 * ini murni lapis 1 (apa yang DITAMPILKAN).
 */
class NavigationService
{
    /**
     * @return array<int, array{group: string, items: array<int, array<string, mixed>>}>
     */
    public function forUser(User $user, ?string $masqueradeRole = null): array
    {
        // When masquerading, filter nav using a temporary user permission check
        // based on what the masquerade role has (via Spatie role permissions)
        $checkUser = $user;
        $masqueradePermissions = null;

        if ($masqueradeRole) {
            $role = \Spatie\Permission\Models\Role::findByName($masqueradeRole, 'web');
            if ($role) {
                $masqueradePermissions = $role->getAllPermissions()->pluck('name')->all();
            }
        }

        $groups = collect(config('navigation.admin', []))
            ->map(function (array $group) use ($checkUser, $masqueradePermissions) {
                $items = collect($group['items'])
                    ->filter(fn (array $item) => $this->visible($item, $checkUser, $masqueradePermissions))
                    ->map(fn (array $item) => $this->resolve($item))
                    ->values()
                    ->all();

                return ['group' => $group['group'], 'items' => $items];
            })
            ->filter(fn (array $group) => count($group['items']) > 0)
            ->values();

        return $groups->all();
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  string[]|null  $masqueradePermissions  When non-null, use these permissions instead of user's
     */
    private function visible(array $item, User $user, ?array $masqueradePermissions = null): bool
    {
        $permissions = $item['permissions'] ?? [];

        if ($permissions === []) {
            return true;
        }

        // When masquerading, check against masquerade role permissions
        if ($masqueradePermissions !== null) {
            foreach ($permissions as $permission) {
                if (in_array($permission, $masqueradePermissions, true)) {
                    return true;
                }
            }
            return false;
        }

        foreach ($permissions as $permission) {
            if ($user->can($permission)) {
                return true;
            }
        }

        return false;
    }

    private const ROUTE_ALIASES = [
        'admin.cashier-session.index' => ['admin.cash.*', 'admin.cash.index', 'admin.cash-accounts.*'],
        'admin.deposit.index'         => ['admin.topup-requests.*', 'admin.topup-requests.index'],
        'admin.sale-returns.index'    => ['admin.sale-returns.*', 'admin.write-offs.*', 'admin.write-offs.index'],
        'admin.products.index'        => ['admin.categories.*', 'admin.categories.index', 'admin.brands.*', 'admin.brands.index', 'admin.units.*', 'admin.units.index'],
        'admin.stock.index'           => ['admin.opnames.*', 'admin.opnames.index', 'admin.transfers.*', 'admin.transfers.index', 'admin.stock-adjustments.*', 'admin.stock-adjustments.index'],
        'admin.purchases.index'       => ['admin.purchase-orders.*', 'admin.purchase-orders.index', 'admin.consignment.*', 'admin.consignment.index', 'admin.purchase-returns.*'],
        'admin.debts.index'           => ['admin.receivables.*', 'admin.receivables.index'],
        'admin.accounts.index'        => ['admin.journals.*', 'admin.journals.index', 'admin.ledger.*', 'admin.ledger.index', 'admin.trial-balance.*', 'admin.trial-balance.index', 'admin.profit-loss.*', 'admin.profit-loss.index', 'admin.balance-sheet.*', 'admin.balance-sheet.index', 'admin.accounting-periods.*', 'admin.accounting-periods.index'],
        'admin.members.index'         => ['admin.points.*', 'admin.points.index'],
        'admin.promos.index'          => ['admin.coupons.*', 'admin.coupons.index'],
        'admin.users.index'           => ['admin.roles.*', 'admin.roles.index', 'admin.activity-logs.*', 'admin.activity-logs.index'],
        'admin.suppliers.index'       => ['admin.outlets.*', 'admin.outlets.index', 'admin.payment-methods.*', 'admin.payment-methods.index'],
    ];

    private const URI_ALIASES = [
        'admin.cashier-session.index' => ['admin/cashier-session*', 'admin/cash*'],
        'admin.deposit.index'         => ['admin/deposit*', 'admin/topup-requests*'],
        'admin.sale-returns.index'    => ['admin/sale-returns*', 'admin/write-offs*'],
        'admin.products.index'        => ['admin/products*', 'admin/categories*', 'admin/brands*', 'admin/units*'],
        'admin.stock.index'           => ['admin/stock*', 'admin/opnames*', 'admin/transfers*', 'admin/stock-adjustments*'],
        'admin.purchases.index'       => ['admin/purchases*', 'admin/purchase-orders*', 'admin/consignment*', 'admin/purchase-returns*'],
        'admin.debts.index'           => ['admin/debts*', 'admin/receivables*'],
        'admin.accounts.index'        => ['admin/accounts*', 'admin/journals*', 'admin/ledger*', 'admin/trial-balance*', 'admin/profit-loss*', 'admin/balance-sheet*', 'admin/accounting-periods*'],
        'admin.members.index'         => ['admin/members*', 'admin/points*'],
        'admin.promos.index'          => ['admin/promos*', 'admin/coupons*'],
        'admin.users.index'           => ['admin/users*', 'admin/roles*', 'admin/activity-logs*'],
        'admin.suppliers.index'       => ['admin/suppliers*', 'admin/outlets*', 'admin/payment-methods*'],
    ];

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function resolve(array $item): array
    {
        $baseRoute = str_ends_with($item['route'], '.index')
            ? substr($item['route'], 0, -6)
            : $item['route'];

        $isActive = Request::routeIs("{$item['route']}*") || Request::routeIs("{$baseRoute}.*");

        if (! $isActive && isset(self::ROUTE_ALIASES[$item['route']])) {
            foreach (self::ROUTE_ALIASES[$item['route']] as $aliasPattern) {
                if (Request::routeIs($aliasPattern)) {
                    $isActive = true;
                    break;
                }
            }
        }

        if (! $isActive && isset(self::URI_ALIASES[$item['route']])) {
            foreach (self::URI_ALIASES[$item['route']] as $uriPattern) {
                if (Request::is($uriPattern)) {
                    $isActive = true;
                    break;
                }
            }
        }

        $badge = $item['badge'] ?? null;
        if (($item['key'] === 'deposit' || $item['route'] === 'admin.deposit.index') && $badge === null) {
            try {
                $pendingCount = \App\Models\TopupRequest::where('status', 'pending')->count();
                if ($pendingCount > 0) {
                    $badge = (string) $pendingCount;
                }
            } catch (\Throwable) {}
        }

        return [
            'key' => $item['key'],
            'label' => $item['label'],
            'href' => route($item['route']),
            'icon' => $item['icon'],
            'highlight' => $item['highlight'] ?? false,
            'active' => $isActive,
            'badge' => $badge,
        ];
    }
}
