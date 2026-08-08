<?php

namespace App\Exports;

use App\Models\User;
use App\Reports\BaseReport;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DefaultValueBinder;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * T-089. Class Export generik yang memformat data laporan secara native ke Excel:
 * - Direct Number & Money formatting (#,##0)
 * - Auto-size column width (tidak ada ### terpotong)
 * - Styled Navy Header dengan Font Bold & Border
 */
class ReportExport extends DefaultValueBinder implements FromQuery, WithCustomValueBinder, WithHeadings, WithMapping, ShouldAutoSize, WithStyles, WithColumnFormatting, WithTitle
{
    private array $columns;

    public function __construct(
        private readonly BaseReport $report,
        private readonly array $filters,
        private readonly User $user,
        private readonly bool $cashierScoped,
    ) {
        $this->columns = $this->report->visibleColumns($this->user);
    }

    public function title(): string
    {
        return substr($this->report->title(), 0, 31);
    }

    public function query(): Builder
    {
        $query = $this->report->query($this->filters, $this->user);

        return $this->cashierScoped ? $this->report->scopeForCashier($query, $this->user) : $query;
    }

    public function headings(): array
    {
        return array_map(fn (array $c) => $c['label'], $this->columns);
    }

    public function map($row): array
    {
        return array_map(function (array $column) use ($row) {
            $value = $row->{$column['key']} ?? null;

            return match ($column['type']) {
                'money', 'signed_money' => (int) $value,
                'number', 'signed_number' => is_numeric($value) ? $value + 0 : $value,
                default => (string) ($value ?? ''),
            };
        }, $this->columns);
    }

    public function columnFormats(): array
    {
        $formats = [];
        $columnIndex = 'A';

        foreach ($this->columns as $column) {
            if (in_array($column['type'], ['money', 'signed_money'], true)) {
                $formats[$columnIndex] = '#,##0';
            } elseif (in_array($column['type'], ['number', 'signed_number'], true)) {
                $formats[$columnIndex] = '#,##0';
            }
            $columnIndex++;
        }

        return $formats;
    }

    public function styles(Worksheet $sheet): array
    {
        $lastColumn = $sheet->getHighestColumn();
        $lastRow = $sheet->getHighestRow();

        // Header Styling: Navy background, White bold text
        $sheet->getStyle("A1:{$lastColumn}1")->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E3A8A'],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        $sheet->getRowDimension(1)->setRowHeight(26);

        // Thin borders across data table
        if ($lastRow > 1) {
            $sheet->getStyle("A1:{$lastColumn}{$lastRow}")->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'E5E7EB'],
                    ],
                ],
            ]);
        }

        return [];
    }

    public function bindValue(Cell $cell, $value): bool
    {
        if (is_string($value) && preg_match('/^[=+\-@]/', $value) === 1) {
            return $cell->setValueExplicit($value, DataType::TYPE_STRING);
        }

        return parent::bindValue($cell, $value);
    }
}
