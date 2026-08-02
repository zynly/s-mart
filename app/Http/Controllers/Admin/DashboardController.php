<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Debt;
use App\Models\DepositReconciliation;
use App\Models\Member;
use App\Models\Receivable;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Stock;
use App\Models\StockLayer;
use App\Reports\SalesByCashierReport;
use App\Reports\SalesByPaymentMethodReport;
use App\Reports\SalesSummaryReport;
use App\Services\CashierSessionService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * T-091/T-092 (Fase 15). Backlog resmi hanya punya 2 tiket dashboard
 * (Owner/Admin, Kasir) — bukan 4 dashboard terpisah per role seperti
 * spec Livewire asli (skillage-mart/prompts/fase-15.md). Satu halaman,
 * dua cabang: kasir (`hasRole('cashier')`, lewat `BaseReport::scopedQuery()`
 * Fase 14, dipakai bersama `ReportController` — Phase D) dapat widget
 * sesi berjalan; role lain dapat widget analitik yang masing-masing
 * baru muncul kalau user punya permission modul terkait — supervisor/
 * warehouse/treasurer otomatis dapat subset relevan tanpa halaman
 * terpisah.
 */
class DashboardController extends Controller
{
    public function __construct(private readonly CashierSessionService $cashierSessionService) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        if ($user->hasRole('cashier')) {
            return Inertia::render('Admin/Dashboard', $this->cashierData($user));
        }

        return Inertia::render('Admin/Dashboard', $this->managerData($user));
    }

    private function cashierData($user): array
    {
        $session = $this->cashierSessionService->getActive($user);
        $today = now()->toDateString();

        $todaySales = Sale::where('user_id', $user->id)
            ->where('status', 'completed')
            ->where('sale_date', '>=', $today)
            ->where('sale_date', '<', Carbon::parse($today)->addDay()->toDateString())
            ->selectRaw('COUNT(*) as transaksi, COALESCE(SUM(grand_total), 0) as omzet')
            ->first();

        return [
            'view' => 'cashier',
            'session' => $session ? [
                'reference' => $session->reference,
                'opened_at' => $session->opened_at->toIso8601String(),
                'opening_cash' => $session->opening_cash,
                'total_sales_cash' => $session->total_sales_cash,
                'total_sales_deposit' => $session->total_sales_deposit,
                'total_sales_noncash' => $session->total_sales_noncash,
                'transaction_count' => $session->transaction_count,
            ] : null,
            'todayStats' => [
                'transaksi' => (int) $todaySales->transaksi,
                'omzet' => (int) $todaySales->omzet,
            ],
        ];
    }

    private function managerData($user): array
    {
        $today = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();

        $data = ['view' => 'manager'];

        if ($user->can('report.view')) {
            $data['statCards'] = $this->statCards($user, $today, $yesterday);
            $data['charts'] = [
                'trend30d' => $this->trend30d($user),
                'byCategory' => $this->salesByCategory($user, $today),
                'byPaymentMethod' => $this->salesByPaymentMethod($user, $today),
                'byHour' => $this->salesByHour($user, $today),
            ];
            $data['recentSales'] = $this->recentSales($user);
            $data['topProducts'] = $this->topProductsThisWeek($user);

            if (! $user->hasRole('cashier')) {
                $data['cashierRanking'] = $this->cashierRanking($user, $today);
            }
        }

        $panels = [];

        if ($user->can('stock.view')) {
            $panels['stockAlerts'] = $this->stockAlerts();
        }

        if ($user->can('debt.view')) {
            $panels['debtsDue'] = $this->debtsDue();
        }

        if ($user->can('receivable.view')) {
            $panels['receivablesOverdue'] = $this->receivablesOverdue();
        }

        if ($user->can('deposit.view')) {
            $panels['depositLiability'] = (int) Member::sum('balance_cache');
        }

        if ($user->can('member.view')) {
            $panels['memberBirthdays'] = $this->memberBirthdays();
        }

        if ($user->can('deposit.adjust')) {
            $panels['reconciliationIssues'] = DepositReconciliation::where('is_resolved', false)->count();
        }

        $data['panels'] = $panels;

        return $data;
    }

    private function statCards($user, string $today, string $yesterday): array
    {
        $report = new SalesSummaryReport;
        $todayRow = $report->scopedQuery(['date_from' => $today, 'date_to' => $today], $user)->first();
        $yesterdayRow = $report->scopedQuery(['date_from' => $yesterday, 'date_to' => $yesterday], $user)->first();

        $omzetToday = (int) ($todayRow->omzet ?? 0);
        $omzetYesterday = (int) ($yesterdayRow->omzet ?? 0);
        $trend = $omzetYesterday > 0 ? round((($omzetToday - $omzetYesterday) / $omzetYesterday) * 100, 1) : 0;

        $transaksi = (int) ($todayRow->transaksi ?? 0);
        $labaKotor = (int) ($todayRow->laba_kotor ?? 0);

        return [
            'omzetHariIni' => $omzetToday,
            'omzetTrend' => $trend,
            'labaKotorHariIni' => $user->can('product.view_cost') ? $labaKotor : null,
            'transaksiHariIni' => $transaksi,
            'rataRataNota' => $transaksi > 0 ? (int) round($omzetToday / $transaksi) : 0,
        ];
    }

    private function trend30d($user): array
    {
        $report = new SalesSummaryReport;
        $rows = $report->scopedQuery([
            'date_from' => now()->subDays(29)->toDateString(),
            'date_to' => now()->toDateString(),
        ], $user)->get();

        return $rows->map(fn ($r) => [
            'tanggal' => $r->tanggal,
            'omzet' => (int) $r->omzet,
        ])->values()->all();
    }

    private function salesByCategory($user, string $today): array
    {
        $query = SaleItem::query()
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->where('sales.status', 'completed')
            ->where('sales.sale_date', '>=', $today)
            ->where('sales.sale_date', '<', Carbon::parse($today)->addDay()->toDateString())
            ->selectRaw("COALESCE(categories.name, 'Tanpa Kategori') as kategori, SUM(sale_items.subtotal) as total")
            ->groupBy('kategori')
            ->orderByDesc('total');

        if ($user->hasRole('cashier')) {
            $query->where('sales.user_id', $user->id);
        }

        return $query->get()->map(fn ($r) => ['kategori' => $r->kategori, 'total' => (int) $r->total])->values()->all();
    }

    private function salesByPaymentMethod($user, string $today): array
    {
        $report = new SalesByPaymentMethodReport;

        return $report->scopedQuery(['date_from' => $today, 'date_to' => $today], $user)
            ->get()
            ->map(fn ($r) => ['metode' => $r->metode, 'total' => (int) $r->total])
            ->values()->all();
    }

    private function salesByHour($user, string $today): array
    {
        $query = Sale::where('status', 'completed')
            ->where('sale_date', '>=', $today)
            ->where('sale_date', '<', Carbon::parse($today)->addDay()->toDateString())
            ->selectRaw('HOUR(sale_date) as jam, COUNT(*) as transaksi')
            ->groupBy('jam')
            ->orderBy('jam');

        if ($user->hasRole('cashier')) {
            $query->where('user_id', $user->id);
        }

        return $query->get()->map(fn ($r) => ['jam' => (int) $r->jam, 'transaksi' => (int) $r->transaksi])->values()->all();
    }

    private function recentSales($user): array
    {
        $query = Sale::with(['user:id,name'])
            ->where('status', 'completed')
            ->latest('sale_date')
            ->limit(10);

        if ($user->hasRole('cashier')) {
            $query->where('user_id', $user->id);
        }

        return $query->get(['id', 'reference', 'sale_date', 'grand_total', 'user_id'])
            ->map(fn ($s) => [
                'reference' => $s->reference,
                'sale_date' => $s->sale_date->toIso8601String(),
                'grand_total' => $s->grand_total,
                'kasir' => $s->user?->name,
            ])->values()->all();
    }

    private function topProductsThisWeek($user): array
    {
        $query = SaleItem::query()
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->where('sales.status', 'completed')
            ->where('sales.sale_date', '>=', now()->subDays(7))
            ->selectRaw('products.name as produk, SUM(sale_items.qty_base) as qty')
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('qty')
            ->limit(5);

        if ($user->hasRole('cashier')) {
            $query->where('sales.user_id', $user->id);
        }

        return $query->get()->map(fn ($r) => ['produk' => $r->produk, 'qty' => (float) $r->qty])->values()->all();
    }

    private function cashierRanking($user, string $today): array
    {
        $report = new SalesByCashierReport;

        return $report->scopedQuery(['date_from' => $today, 'date_to' => $today], $user)
            ->limit(5)
            ->get()
            ->map(fn ($r) => ['kasir' => $r->kasir, 'omzet' => (int) $r->omzet])
            ->values()->all();
    }

    private function stockAlerts(): array
    {
        return [
            // T-088 (Phase D): dulu SUM(stock_layers.qty_remaining) vs
            // MIN(products.min_stock) lewat groupBy/having — sumber data
            // BEDA dari StockController (yang pakai `stocks`, cache
            // teragregasi yang disinkronkan transaksional oleh
            // StockService::recalculateCache() di setiap mutasi layer,
            // lihat app/Services/StockService.php). Disamakan ke `stocks`
            // di sini juga: satu sumber, query lebih sederhana (tanpa
            // groupBy/having), dan konsisten dengan angka yang dilihat
            // user di halaman Stok.
            'critical' => Stock::query()
                ->join('products', 'products.id', '=', 'stocks.product_id')
                ->where('stocks.qty', '>', 0)
                ->whereColumn('stocks.qty', '<=', 'products.min_stock')
                ->count(),
            'expiringSoon' => StockLayer::query()
                ->where('qty_remaining', '>', 0)
                ->whereNotNull('expired_at')
                ->where('expired_at', '<=', now()->addDays(30)->toDateString())
                ->count(),
        ];
    }

    private function debtsDue(): int
    {
        return Debt::whereIn('status', ['unpaid', 'partial'])
            ->where('due_date', '<=', now()->addDays(7)->toDateString())
            ->count();
    }

    private function receivablesOverdue(): int
    {
        return Receivable::where('status', 'overdue')->count();
    }

    private function memberBirthdays(): array
    {
        $now = now();
        $end = now()->addDays(7);

        return Member::whereNotNull('birth_date')
            ->where('status', 'active')
            ->get(['id', 'name', 'birth_date'])
            ->filter(function ($m) use ($now, $end) {
                $next = Carbon::parse($m->birth_date)->setYear($now->year);
                if ($next->lt($now->startOfDay())) {
                    $next->addYear();
                }

                return $next->between($now->startOfDay(), $end->endOfDay());
            })
            ->map(fn ($m) => ['name' => $m->name, 'birth_date' => $m->birth_date->format('Y-m-d')])
            ->values()->all();
    }
}
