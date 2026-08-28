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

class CashierSessionSalesSheet implements FromArray, WithTitle, ShouldAutoSize, WithStyles
{
    public function __construct(
        private readonly CashierSession $session,
    ) {
        $this->session->loadMissing([
            'sales.member',
            'sales.payments.paymentMethod',
            'sales.items.product',
        ]);
    }

    public function title(): string
    {
        return 'Daftar Nota Penjualan';
    }

    public function array(): array
    {
        $rows = [
            ['No.', 'No. Referensi Nota', 'Waktu Transaksi', 'Pelanggan / Anggota', 'Metode Pembayaran', 'Item / Barang Dibeli', 'Subtotal', 'Diskon', 'Pajak', 'Total Belanja (Rp)', 'Status'],
        ];

        $idx = 1;
        foreach ($this->session->sales as $sale) {
            $methods = $sale->payments->map(fn ($p) => $p->paymentMethod?->name ?? 'Tunai')->implode(', ');
            $items = $sale->items->map(fn ($i) => ($i->product?->name ?? 'Item') . ' (' . $i->qty . 'x)')->implode('; ');

            $statusText = match ($sale->status) {
                'completed' => 'Selesai',
                'voided' => 'Dibatalkan (Void)',
                'refunded' => 'Diretur (Refund)',
                default => (string) $sale->status,
            };

            $rows[] = [
                $idx++,
                $sale->reference,
                $sale->sale_date?->format('Y-m-d H:i:s') ?? '-',
                $sale->member ? ($sale->member->name . ' (' . $sale->member->member_number . ')') : 'Pelanggan Umum',
                $methods ?: 'Tunai',
                $items,
                $sale->subtotal ?? $sale->grand_total,
                $sale->discount_amount ?? 0,
                $sale->tax_amount ?? 0,
                $sale->grand_total,
                $statusText,
            ];
        }

        if (count($rows) === 1) {
            $rows[] = ['-', '-', '-', 'Belum ada nota penjualan', '-', '-', 0, 0, 0, 0, '-'];
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
            $sheet->getStyle("G2:J{$lastRow}")->getNumberFormat()->setFormatCode('#,##0');
        }

        return [];
    }
}
