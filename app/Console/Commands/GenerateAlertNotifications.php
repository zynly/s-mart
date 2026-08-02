<?php

namespace App\Console\Commands;

use App\Models\Debt;
use App\Models\DepositReconciliation;
use App\Models\Receivable;
use App\Models\StockLayer;
use App\Models\User;
use App\Notifications\AlertNotification;
use Illuminate\Console\Command;

/**
 * T-094 (Fase 15). Dijadwalkan harian (routes/console.php) bersama 5
 * command lain yang sudah ada sejak fase-fase awal. Dilingkupi ke
 * kondisi AMBANG BATAS yang butuh dipantau proaktif (stok kritis/
 * kadaluwarsa, hutang jatuh tempo, piutang menunggak, rekonsiliasi
 * deposit belum selesai) — TIDAK termasuk notifikasi "PO/opname/top-up
 * menunggu approval" (item spec asli lain yang disebut lewat kata
 * "dll", bukan daftar wajib eksplisit di tiket): item approval-pending
 * sudah terlihat lewat filter status di halaman masing-masing, bukan
 * kondisi tersembunyi seperti ambang batas yang mendekat diam-diam.
 *
 * Idempotent: skip kalau notifikasi UNREAD dengan dedupe_key yang sama
 * untuk user itu sudah ada — supaya tidak spam pada tiap run harian
 * selama kondisinya belum berubah/dibaca.
 */
class GenerateAlertNotifications extends Command
{
    protected $signature = 'notifications:generate-alerts';

    protected $description = 'Buat notifikasi in-app untuk ambang batas stok, hutang, piutang, dan rekonsiliasi deposit';

    public function handle(): int
    {
        $count = 0;
        $count += $this->stockAlerts();
        $count += $this->debtAlerts();
        $count += $this->receivableAlerts();
        $count += $this->reconciliationAlerts();

        $this->info("Selesai: {$count} notifikasi baru dibuat.");

        return self::SUCCESS;
    }

    private function stockAlerts(): int
    {
        $critical = StockLayer::query()
            ->join('products', 'products.id', '=', 'stock_layers.product_id')
            ->where('stock_layers.qty_remaining', '>', 0)
            ->groupBy('products.id', 'products.name')
            ->havingRaw('SUM(stock_layers.qty_remaining) <= MIN(products.min_stock)')
            ->selectRaw('products.id, products.name')
            ->get();

        $created = 0;
        foreach ($critical as $product) {
            $created += $this->notifyPermission(
                'stock.view',
                'Stok kritis',
                "{$product->name} sudah mencapai atau di bawah batas minimum.",
                route('admin.stock.index'),
                "stock-critical-{$product->id}",
            );
        }

        $expiring = StockLayer::query()
            ->join('products', 'products.id', '=', 'stock_layers.product_id')
            ->where('stock_layers.qty_remaining', '>', 0)
            ->whereNotNull('stock_layers.expired_at')
            ->where('stock_layers.expired_at', '<=', now()->addDays(30)->toDateString())
            ->select('stock_layers.id', 'products.name', 'stock_layers.expired_at')
            ->get();

        foreach ($expiring as $layer) {
            $created += $this->notifyPermission(
                'stock.view',
                'Stok akan kadaluwarsa',
                "{$layer->name} akan kadaluwarsa pada {$layer->expired_at->format('d M Y')}.",
                route('admin.stock.index'),
                "stock-expiring-{$layer->id}",
            );
        }

        return $created;
    }

    private function debtAlerts(): int
    {
        $debts = Debt::whereIn('status', ['unpaid', 'partial'])
            ->where('due_date', '<=', now()->addDays(7)->toDateString())
            ->with('supplier:id,name')
            ->get();

        $created = 0;
        foreach ($debts as $debt) {
            $created += $this->notifyPermission(
                'debt.view',
                'Hutang jatuh tempo',
                "Hutang ke {$debt->supplier?->name} ({$debt->reference}) jatuh tempo {$debt->due_date->format('d M Y')}.",
                route('admin.debts.index'),
                "debt-due-{$debt->id}",
            );
        }

        return $created;
    }

    private function receivableAlerts(): int
    {
        $receivables = Receivable::where('status', 'overdue')->with('member:id,name')->get();

        $created = 0;
        foreach ($receivables as $receivable) {
            $created += $this->notifyPermission(
                'receivable.view',
                'Piutang menunggak',
                "Piutang {$receivable->member?->name} sudah menunggak sejak {$receivable->due_date->format('d M Y')}.",
                route('admin.receivables.index'),
                "receivable-overdue-{$receivable->id}",
            );
        }

        return $created;
    }

    private function reconciliationAlerts(): int
    {
        $unresolved = DepositReconciliation::where('is_resolved', false)->with('member:id,name')->get();

        $created = 0;
        foreach ($unresolved as $recon) {
            $created += $this->notifyPermission(
                'deposit.adjust',
                'Selisih rekonsiliasi saldo',
                "Saldo deposit {$recon->member?->name} selisih Rp".number_format($recon->difference, 0, ',', '.').' dari ledger.',
                route('admin.deposit.index'),
                "deposit-recon-{$recon->id}",
            );
        }

        return $created;
    }

    private function notifyPermission(string $permission, string $title, string $message, string $url, string $dedupeKey): int
    {
        $users = User::permission($permission)->where('is_active', true)->get();
        $created = 0;

        foreach ($users as $user) {
            $alreadyNotified = $user->unreadNotifications()
                ->where('data->dedupe_key', $dedupeKey)
                ->exists();

            if ($alreadyNotified) {
                continue;
            }

            $user->notify(new AlertNotification($title, $message, $url, $dedupeKey));
            $created++;
        }

        return $created;
    }
}
