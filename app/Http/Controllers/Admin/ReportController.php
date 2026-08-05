<?php

namespace App\Http\Controllers\Admin;

use App\Exports\ReportExport;
use App\Http\Controllers\Controller;
use App\Jobs\GenerateReportExportJob;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\User;
use App\Notifications\ReportExportReadyNotification;
use App\Reports\BaseReport;
use App\Reports\ReportRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * Ambang batas T-089 (CATATAN-PERBAIKAN.md §Fase14): >5000 baris
     * lewat antrian + notifikasi, <=5000 unduh langsung.
     */
    private const SYNC_EXPORT_LIMIT = 5000;

    public function index(Request $request): Response
    {
        $user = $request->user();

        $reports = collect(ReportRegistry::all())
            ->map(fn (string $class) => new $class)
            ->filter(fn (BaseReport $r) => $this->visibleTo($r, $user))
            ->map(fn (BaseReport $r) => [
                'key' => $r->key(),
                'title' => $r->title(),
                'category' => $r->category(),
            ])
            ->values();

        return Inertia::render('Admin/Reports/Index', [
            'reports' => $reports,
            'financialLinks' => $user->can('ledger.view') && ! $user->hasRole('cashier')
                ? [
                    ['title' => 'Laba Rugi', 'href' => route('admin.profit-loss.index')],
                    ['title' => 'Neraca', 'href' => route('admin.balance-sheet.index')],
                ]
                : [],
            'exports' => $user->notifications()
                ->where('type', ReportExportReadyNotification::class)
                ->latest()
                ->limit(10)
                ->get(['id', 'data', 'read_at', 'created_at']),
        ]);
    }

    public function show(string $key, Request $request): Response
    {
        $user = $request->user();
        $report = $this->resolve($key, $user);
        $filters = $request->only(collect($report->filters())->pluck('key')->all());

        $rows = $report->scopedQuery($filters, $user)->paginate(50)->withQueryString();

        return Inertia::render('Admin/Reports/Show', [
            'reportKey' => $report->key(),
            'title' => $report->title(),
            'filterDefs' => $report->filters(),
            'columns' => $report->visibleColumns($user),
            'rows' => $rows,
            'summary' => $report->visibleSummary($report->summary($report->scopedQuery($filters, $user), $user), $user),
            // Gap G-05: tombol "Ekspor Excel" hanya dirender kalau user
            // benar-benar punya izin ekspor laporan ini — backend TETAP
            // menolak di export() terlepas dari flag ini (pertahanan
            // berlapis, bukan pengganti pengecekan server).
            'canExport' => $user->can($report->exportPermission()),
            'filters' => $filters,
            'outlets' => Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'cashiers' => User::role('cashier')->orderBy('name')->get(['id', 'name']),
            'products' => Product::where('is_active', true)->orderBy('name')->limit(500)->get(['id', 'name', 'sku']),
        ]);
    }

    /**
     * Selalu balas JSON (bukan RedirectResponse/StreamedResponse
     * campur-baur) supaya frontend bisa panggil lewat fetch() untuk
     * KEDUA jalur — sinkron & antrian — dan menampilkan hasil yang
     * sesuai (unduh langsung vs toast "sedang diproses"). File sinkron
     * TETAP ditulis ke storage lalu diunduh lewat signed URL yang sama
     * dengan jalur antrian, bukan di-stream inline — menyatukan kedua
     * jalur lewat satu mekanisme unduh yang sama (Laravel signed route,
     * bukan pengecekan kepemilikan notifikasi ad-hoc).
     */
    public function export(string $key, Request $request): JsonResponse
    {
        $user = $request->user();
        $report = $this->resolve($key, $user);
        // Gap G-05: melihat laporan (requiredPermission()) TIDAK berarti
        // boleh mengekspornya — dicek eksplisit di sini, terpisah dari
        // resolve() yang hanya menggerbang akses lihat.
        abort_unless($user->can($report->exportPermission()), 403);
        $filters = $request->only(collect($report->filters())->pluck('key')->all());
        $cashierScoped = $user->hasRole('cashier');

        // Builder::count() polos gagal untuk query ber-groupBy (alias
        // SELECT tidak ada lagi di query count yang disederhanakan) —
        // paginate()->total() sudah menangani ini dengan benar (dipakai
        // juga oleh show(), terverifikasi tinker), jadi dipakai ulang
        // di sini alih-alih reimplementasi count-aware groupBy sendiri.
        $rowCount = $report->scopedQuery($filters, $user)->paginate(1)->total();

        if ($rowCount === 0) {
            return response()->json(['status' => 'empty', 'message' => 'Tidak ada data untuk diekspor.'], 422);
        }

        if ($rowCount <= self::SYNC_EXPORT_LIMIT) {
            $export = new ReportExport($report, $filters, $user, $cashierScoped);
            $filename = Str::uuid().'.xlsx';
            Excel::store($export, "exports/{$filename}", 'local');

            return response()->json([
                'status' => 'ready',
                // Audit Fase 7 (Temuan Rendah): user_id disertakan &
                // diverifikasi di download() — signed URL sendiri terbukti
                // valid (tidak bisa ditebak/dipalsukan tanda tangannya),
                // tapi TIDAK terikat ke siapa yang boleh memakainya. Kalau
                // link bocor (screen share, riwayat browser bersama),
                // siapa pun yang login bisa mengunduhnya, termasuk data
                // yang harusnya di luar cakupan izinnya sendiri.
                'downloadUrl' => URL::temporarySignedRoute('admin.reports.download', now()->addHours(24), ['filename' => $filename, 'user_id' => $user->id]),
                'rowCount' => $rowCount,
            ]);
        }

        GenerateReportExportJob::dispatch($report->key(), $filters, $user->id, $cashierScoped, $rowCount);

        return response()->json([
            'status' => 'queued',
            'message' => "Ekspor {$rowCount} baris sedang diproses di latar belakang — Anda akan diberi tahu lewat panel \"Ekspor Saya\" saat selesai.",
        ]);
    }

    public function download(string $filename, Request $request): StreamedResponse
    {
        abort_unless($request->hasValidSignature(), 403);
        // Audit Fase 7 (Temuan Rendah): signed URL sah tidak lagi cukup
        // sendirian — harus dipakai oleh user yang SAMA yang memicu
        // ekspornya. user_id absen (link lama dari sebelum perbaikan ini)
        // sengaja DILOLOSKAN (bukan ditolak) supaya tidak mendadak
        // mematahkan link yang sudah beredar sebelum deploy perbaikan ini.
        $expectedUserId = $request->integer('user_id');
        abort_if($expectedUserId !== 0 && $expectedUserId !== $request->user()->id, 403);
        abort_unless(Storage::disk('local')->exists("exports/{$filename}"), 404);

        return Storage::disk('local')->download("exports/{$filename}");
    }

    private function resolve(string $key, User $user): BaseReport
    {
        $report = ReportRegistry::make($key);

        abort_unless($this->visibleTo($report, $user), 403);

        return $report;
    }

    /**
     * Kasir (Temuan D, T-090): hanya kategori 'penjualan', terlepas dari
     * permission modul lain yang kebetulan dipegang (mis. stock.view
     * untuk keperluan retur/tukar barang, bukan untuk laporan).
     */
    private function visibleTo(BaseReport $report, User $user): bool
    {
        if ($user->hasRole('cashier')) {
            return $report->category() === 'penjualan';
        }

        return $user->can($report->requiredPermission());
    }
}
