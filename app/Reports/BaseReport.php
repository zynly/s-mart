<?php

namespace App\Reports;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * T-084 (Fase 14). Setiap laporan mewarisi ini — satu sumber query per
 * metric, dipakai ulang oleh laporan (di sini) dan dashboard (Fase 15,
 * CATATAN-PERBAIKAN.md §Fase14). `category()`+`requiredPermission()`
 * dipakai ReportController untuk gating akses per role (T-090) —
 * bukan sekadar permission `report.view` yang dipegang semua role
 * termasuk kasir, tapi permission modul yang benar-benar relevan per
 * kategori (mis. `stock.view` untuk laporan stok).
 */
abstract class BaseReport
{
    abstract public function key(): string;

    abstract public function title(): string;

    /**
     * @return 'penjualan'|'stok'|'keuangan'|'piutang_hutang'
     */
    abstract public function category(): string;

    abstract public function requiredPermission(): string;

    /**
     * Deklarasi filter yang tersedia untuk frontend — dibaca
     * `Admin/Reports/Show.tsx` untuk merender filter bar generik.
     *
     * @return array<int, array{key:string, label:string, type:string}>
     */
    abstract public function filters(): array;

    abstract public function query(array $filters, User $user): Builder;

    /**
     * @return array<int, array{key:string, label:string, type:string, hideWithoutCost?:bool}>
     */
    abstract public function columns(User $user): array;

    /**
     * @return array<string, mixed>
     */
    public function summary(Builder $query, User $user): array
    {
        return [];
    }

    /**
     * Filter kolom `hideWithoutCost` bila user tidak punya
     * `product.view_cost` — satu implementasi dipakai semua laporan,
     * dibaca ulang oleh Show.tsx (props) & ReportExport (heading/baris)
     * supaya tidak ada logika sembunyi-kolom yang terduplikasi/beda
     * antara layar dan ekspor.
     *
     * @return array<int, array{key:string, label:string, type:string, hideWithoutCost?:bool}>
     */
    final public function visibleColumns(User $user): array
    {
        if ($user->can('product.view_cost')) {
            return $this->columns($user);
        }

        return array_values(array_filter($this->columns($user), fn (array $c) => ! ($c['hideWithoutCost'] ?? false)));
    }

    /**
     * Baris ringkasan (`summary()`) sering memakai key yang sama
     * dengan kolom cost-sensitif (mis. 'hpp'/'margin') — tanpa filter
     * ini, angka HPP/margin bocor lewat baris ringkasan meski kolom
     * tabelnya sendiri sudah disembunyikan `visibleColumns()`. Dipakai
     * sumber kebenaran yang SAMA (flag `hideWithoutCost` di
     * `columns()`), bukan daftar key terpisah yang bisa tidak sinkron.
     *
     * @param  array<string, mixed>  $summary
     * @return array<string, mixed>
     */
    final public function visibleSummary(array $summary, User $user): array
    {
        if ($user->can('product.view_cost')) {
            return $summary;
        }

        $hiddenKeys = array_column(array_filter($this->columns($user), fn (array $c) => $c['hideWithoutCost'] ?? false), 'key');

        return array_diff_key($summary, array_flip($hiddenKeys));
    }

    /**
     * Kasir (Temuan D, T-090): hanya lihat laporan miliknya sendiri.
     * Default no-op — laporan kategori `penjualan` override ini,
     * kategori lain tidak pernah dipanggil untuk kasir sama sekali
     * (disaring lebih dulu di ReportController lewat category()).
     */
    public function scopeForCashier(Builder $query, User $user): Builder
    {
        return $query;
    }
}
