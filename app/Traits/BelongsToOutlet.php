<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

/**
 * REVISI-R1-v2.md §1.4 — fondasi multi-outlet "versi ringan". Dipasang
 * di semua model transaksi (Sale, SaleReturn, Purchase, PurchaseReturn,
 * StockLayer, StockMovement, Stock, CashierSession, CashTransaction,
 * CashAccount, DepositTransaction, StockOpname, Receivable, Debt,
 * Journal).
 *
 * Perilaku:
 * - Owner: bypass total, lihat semua outlet (§1.2).
 * - User tanpa outlet diketahui sama sekali (belum ada baris
 *   `outlet_user` MAUPUN `users.outlet_id` — mis. user lama sebelum
 *   fitur ini, atau fixture test yang sengaja tidak mengatur outlet):
 *   scope TIDAK memfilter apa pun. Ini pilihan sengaja untuk versi
 *   ringan — sistem baru satu outlet, jadi "tidak tahu outlet" jauh
 *   lebih aman diperlakukan sebagai "belum perlu dibatasi" daripada
 *   "filter ke outlet_id IN ()" yang akan mengosongkan SEMUA data bagi
 *   pengguna itu (memutus test/kode existing yang belum sempat
 *   diperbarui memakai sistem outlet baru).
 * - User dengan outlet diketahui: hanya melihat baris outlet miliknya.
 *
 * Auto-fill `outlet_id` saat create dari `session('active_outlet_id')`
 * (diisi otomatis oleh SetActiveOutlet middleware) atau outlet primary
 * user yang login — bukan hardcode outlet pertama.
 */
trait BelongsToOutlet
{
    protected static function bootBelongsToOutlet(): void
    {
        static::addGlobalScope('outlet', function (Builder $builder) {
            $user = auth()->user();

            if (! $user) {
                return;
            }

            if (method_exists($user, 'hasRole') && $user->hasRole('owner')) {
                return;
            }

            $outletIds = method_exists($user, 'outletIds') ? $user->outletIds() : collect();

            if ($outletIds->isEmpty()) {
                return;
            }

            $builder->where(function (Builder $q) use ($builder, $outletIds) {
                $q->whereIn($builder->getModel()->getTable().'.outlet_id', $outletIds->all())
                  ->orWhereNull($builder->getModel()->getTable().'.outlet_id');
            });
        });

        static::creating(function ($model) {
            if (empty($model->outlet_id)) {
                $user = auth()->user();
                $model->outlet_id = session('active_outlet_id')
                    ?? $user?->primaryOutletId()
                    ?? \App\Models\Outlet::where('is_main', true)->value('id')
                    ?? \App\Models\Outlet::value('id');
            }
        });
    }
}
