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
    public function forUser(User $user): array
    {
        $groups = collect(config('navigation.admin', []))
            ->map(function (array $group) use ($user) {
                $items = collect($group['items'])
                    ->filter(fn (array $item) => $this->visible($item, $user))
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
     */
    private function visible(array $item, User $user): bool
    {
        $permissions = $item['permissions'] ?? [];

        if ($permissions === []) {
            return true;
        }

        foreach ($permissions as $permission) {
            if ($user->can($permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function resolve(array $item): array
    {
        return [
            'key' => $item['key'],
            'label' => $item['label'],
            'href' => route($item['route']),
            'icon' => $item['icon'],
            'highlight' => $item['highlight'] ?? false,
            'active' => Request::routeIs("{$item['route']}*"),
            'badge' => $item['badge'] ?? null,
        ];
    }
}
