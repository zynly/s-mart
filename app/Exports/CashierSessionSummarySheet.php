<?php

namespace App\Exports;

use App\Models\CashierSession;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class CashierSessionSummarySheet implements FromArray, WithTitle, ShouldAutoSize, WithStyles
{
    public function __construct(
        private readonly CashierSession $session,
    ) {
        $this->session->loadMissing(['user', 'cashAccount', 'outlet']);
    }

    public function title(): string
    {
        return 'Ringkasan Audit Sesi';
    }

    public function array(): array
    {
        $s = $this->session;
        $statusLabel = match ($s->status) {
            'closed' => 'Ditutup Normal',
            'force_closed' => 'Ditutup Paksa',
            'open' => 'Buka / Aktif',
            default => (string) $s->status,
        };

        return [
            ['AUDIT & DETAIL SESI KASIR — ' . $s->reference, ''],
            ['', ''],
            ['INFORMASI SESI', ''],
            ['Nomor Referensi', $s->reference],
            ['Kasir', $s->user?->name ?? 'Kasir'],
            ['Laci Kasir', $s->cashAccount?->name ?? 'Laci Kasir'],
            ['Outlet', $s->outlet?->name ?? 'Outlet Utama'],
            ['Waktu Buka Sesi', $s->opened_at?->format('Y-m-d H:i:s') ?? '-'],
            ['Waktu Tutup Sesi', $s->closed_at?->format('Y-m-d H:i:s') ?? 'Masih Aktif'],
            ['Status Sesi', $statusLabel],
            ['Catatan / Alasan Selisih', $s->difference_reason ?? $s->note ?? '-'],
            ['', ''],
            ['RINCIAN ARUS KAS & REKONSILIASI', 'NOMINAL (RP)'],
            ['Modal Awal Kas', $s->opening_cash],
            ['(+) Penjualan Tunai', (int) ($s->total_sales_cash ?? 0)],
            ['(+) Penjualan Saldo Deposit Santri', (int) ($s->total_sales_deposit ?? 0)],
            ['(+) Penjualan Non-Tunai (QRIS/EDC/Transfer)', (int) ($s->total_sales_noncash ?? 0)],
            ['(+) Penjualan Tempo / Kredit (Bon)', (int) ($s->total_sales_credit ?? 0)],
            ['(+) Topup Saldo Deposit Tunai di Kasir', (int) ($s->total_topup_cash ?? 0)],
            ['(+) Pelunasan Piutang Kasir', (int) ($s->total_receivable_cash ?? 0)],
            ['(+) Kas Masuk Operasional', (int) ($s->total_cash_in ?? 0)],
            ['(-) Kas Keluar Operasional / Tarik Deposit', (int) ($s->total_cash_out ?? 0)],
            ['Expected Cash (Seharusnya di Laci)', $s->expected_cash ?? 0],
            ['Actual Cash (Fisik Uang Dihitung)', $s->actual_cash ?? 0],
            ['Selisih Kas (Difference)', $s->difference ?? 0],
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => '1E3A8A']],
        ]);

        $sheet->getStyle('A3:B3')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A8A']],
        ]);

        $sheet->getStyle('A13:B13')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A8A']],
        ]);

        $sheet->getStyle('A3:B25')->applyFromArray([
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D1D5DB']]],
        ]);

        $sheet->getStyle('B14:B25')->getNumberFormat()->setFormatCode('#,##0');

        return [];
    }
}
