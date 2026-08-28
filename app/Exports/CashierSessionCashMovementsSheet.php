<?php

namespace App\Exports;

use App\Models\CashierSession;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class CashierSessionCashMovementsSheet implements FromArray, WithTitle, ShouldAutoSize, WithStyles
{
    public function __construct(
        private readonly CashierSession $session,
    ) {
        $this->session->loadMissing(['cashTransactions.cashCategory']);
    }

    public function title(): string
    {
        return 'Mutasi Kas Operasional';
    }

    public function array(): array
    {
        $rows = [
            ['No.', 'No. Transaksi', 'Waktu', 'Jenis Mutasi', 'Kategori', 'Nominal (Rp)', 'Keterangan'],
        ];

        $idx = 1;
        foreach ($this->session->cashTransactions as $trx) {
            $rows[] = [
                $idx++,
                $trx->reference,
                $trx->created_at?->format('Y-m-d H:i:s') ?? '-',
                $trx->type === 'in' ? 'Kas Masuk' : 'Kas Keluar',
                $trx->cashCategory?->name ?? ($trx->type === 'in' ? 'Kas Masuk' : 'Kas Keluar'),
                $trx->amount,
                $trx->description ?? '-',
            ];
        }

        if (count($rows) === 1) {
            $rows[] = ['-', '-', '-', 'Tidak ada mutasi kas operasional', '-', 0, '-'];
        }

        return $rows;
    }

    public function styles(Worksheet $sheet): array
    {
        $lastCol = $sheet->getHighestColumn();
        $lastRow = $sheet->getHighestRow();

        $sheet->getStyle("A1:{$lastCol}1")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A8A']],
        ]);

        if ($lastRow > 1) {
            $sheet->getStyle("A1:{$lastCol}{$lastRow}")->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D1D5DB']]],
            ]);
            $sheet->getStyle("F2:F{$lastRow}")->getNumberFormat()->setFormatCode('#,##0');
        }

        return [];
    }
}
