<?php

namespace App\Exports;

use App\Models\CashierSession;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class CashierSessionAuditExport implements WithMultipleSheets
{
    use Exportable;

    public function __construct(
        private readonly CashierSession $session,
    ) {}

    public function sheets(): array
    {
        return [
            new CashierSessionSummarySheet($this->session),
            new CashierSessionCashMovementsSheet($this->session),
            new CashierSessionSalesSheet($this->session),
        ];
    }
}
