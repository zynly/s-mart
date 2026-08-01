<?php

namespace App\Jobs;

use App\Exports\ReportExport;
use App\Models\User;
use App\Notifications\ReportExportReadyNotification;
use App\Reports\ReportRegistry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

/**
 * T-089. Ekspor >5000 baris (shared hosting tanpa Supervisor — cron
 * `schedule:run` per menit yang memicu `queue:work --stop-when-empty`,
 * BUKAN daemon terus-menerus, sesuai CATATAN-PERBAIKAN.md §Fase14).
 */
class GenerateReportExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private readonly string $reportKey,
        private readonly array $filters,
        private readonly int $userId,
        private readonly bool $cashierScoped,
        private readonly int $rowCount,
    ) {}

    public function handle(): void
    {
        $user = User::findOrFail($this->userId);
        $report = ReportRegistry::make($this->reportKey);

        $filename = Str::uuid()->toString().'.xlsx';
        $export = new ReportExport($report, $this->filters, $user, $this->cashierScoped);

        Excel::store($export, "exports/{$filename}", 'local');

        $user->notify(new ReportExportReadyNotification(
            $report->title(),
            URL::temporarySignedRoute('admin.reports.download', now()->addHours(24), ['filename' => $filename]),
            $this->rowCount,
        ));
    }
}
