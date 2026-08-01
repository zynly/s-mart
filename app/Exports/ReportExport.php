<?php

namespace App\Exports;

use App\Models\User;
use App\Reports\BaseReport;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DefaultValueBinder;

/**
 * T-089. Satu class Export generik dipakai SEMUA laporan — menerima
 * instance BaseReport + filters + user di constructor, bukan satu
 * Export class per laporan. Kolom yang diekspor persis sama dengan
 * `visibleColumns()` (satu sumber kebenaran dengan Show.tsx, T-090 —
 * user tanpa product.view_cost tidak dapat kolom HPP/margin di Excel
 * juga, bukan cuma disembunyikan di layar).
 */
class ReportExport extends DefaultValueBinder implements FromQuery, WithCustomValueBinder, WithHeadings, WithMapping
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

    /**
     * Temuan audit keamanan: nilai teks bebas (nama produk/supplier,
     * catatan retur, dst — semuanya diisi manusia lewat form tanpa
     * larangan karakter) sebelumnya dikirim ke PhpSpreadsheet apa
     * adanya. String yang diawali =/+/-/@ ditafsirkan Excel sebagai
     * formula (mis. `=HYPERLINK(...)`) dan bisa tereksekusi di mesin
     * siapa pun yang membuka file ekspor. Paksa TYPE_STRING untuk
     * nilai semacam itu supaya Excel selalu memperlakukannya sebagai teks.
     */
    public function bindValue(Cell $cell, $value): bool
    {
        if (is_string($value) && preg_match('/^[=+\-@]/', $value) === 1) {
            return $cell->setValueExplicit($value, DataType::TYPE_STRING);
        }

        return parent::bindValue($cell, $value);
    }
}
