<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * T-104 (Fase 17). Spec asli minta dua tombol: "reset data transaksi"
 * dan "reset seluruh sistem" (termasuk akun & master data). HANYA yang
 * pertama dibangun sebagai tombol web di sini — reset total yang bisa
 * diklik siapa pun berperan owner dari browser adalah risiko yang tidak
 * proporsional untuk aplikasi yang memegang uang sungguhan (kesalahan
 * klik/social-engineering bisa menghapus seluruh histori keuangan tanpa
 * jalan tengah). Reset total tetap tersedia lewat `php artisan migrate:
 * fresh --seed` di server (akses SSH saja), bukan endpoint HTTP.
 */
class SystemResetController extends Controller
{
    /**
     * Tabel transaksi yang di-truncate — TIDAK termasuk tabel master
     * (products, members, guardians, users, settings, dst), RBAC
     * (roles/permissions), maupun `activity_log` (riwayat audit,
     * termasuk aksi reset ini sendiri, sengaja dipertahankan).
     */
    private const TRANSACTION_TABLES = [
        'sale_payments', 'sale_items', 'sale_holds',
        'sale_return_refunds', 'sale_return_items', 'sale_returns', 'sales',
        'purchase_other_costs', 'purchase_items', 'purchase_orders', 'purchase_order_items',
        'purchase_return_items', 'purchase_returns', 'purchases',
        'consignment_settlement_items', 'consignment_settlements',
        'debt_payments', 'debts',
        'receivable_payments', 'receivables',
        'deposit_reconciliations', 'deposit_transactions', 'topup_requests',
        'cash_transactions', 'cashier_sessions',
        'stock_layer_consumptions', 'stock_layers', 'stock_movements', 'stocks',
        'stock_adjustment_items', 'stock_adjustments',
        'stock_opname_items', 'stock_opnames',
        'stock_transfer_items', 'stock_transfers',
        'stock_write_offs',
        'journal_entries', 'journals',
        'point_transactions', 'coupon_redemptions',
        'exchanges', 'payroll_deductions',
        'notification_logs',
    ];

    public function index(): Response
    {
        $backups = collect(Storage::disk('local')->allFiles(config('backup.backup.name')))
            ->filter(fn (string $path) => str_ends_with($path, '.zip'))
            ->map(fn (string $path) => [
                'name' => basename($path),
                'size' => Storage::disk('local')->size($path),
                'created_at' => date('c', Storage::disk('local')->lastModified($path)),
            ])
            ->sortByDesc('created_at')
            ->values();

        return Inertia::render('Admin/Settings/DangerZone', [
            'storeName' => config('app.name'),
            'backups' => $backups,
        ]);
    }

    public function resetTransactions(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'confirm_name' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        if ($data['confirm_name'] !== config('app.name')) {
            return back()->withErrors(['confirm_name' => 'Nama toko tidak cocok.']);
        }

        $actor = Auth::guard('web')->user();

        if (! Hash::check($data['password'], $actor->password)) {
            return back()->withErrors(['password' => 'Password salah.']);
        }

        // Snapshot terakhir sebelum data transaksi hilang permanen —
        // bukan langkah opsional, TRUNCATE tidak bisa dibatalkan.
        Artisan::call('backup:run');

        activity('system')
            ->causedBy($actor)
            ->withProperties(['ip' => $request->ip(), 'tables' => self::TRANSACTION_TABLES])
            ->log('Reset data transaksi dimulai');

        // TRUNCATE MySQL auto-commit (bukan transaksional) — backup di
        // atas adalah jaring pengaman sungguhan, bukan DB::transaction().
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        foreach (self::TRANSACTION_TABLES as $table) {
            DB::table($table)->truncate();
        }
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        activity('system')
            ->causedBy($actor)
            ->log('Reset data transaksi selesai');

        return redirect()
            ->route('admin.settings.danger-zone')
            ->with('success', 'Data transaksi berhasil direset. Master data & akun tetap utuh.');
    }
}
