<?php

namespace App\Reports;

/**
 * Satu sumber kebenaran untuk peta key => class laporan — dipakai
 * `ReportController` (halaman) dan `GenerateReportExportJob` (antrian,
 * T-089) supaya keduanya tidak punya salinan array yang bisa
 * kadaluwarsa satu sama lain.
 */
class ReportRegistry
{
    /**
     * @var array<string, class-string<BaseReport>>
     */
    private const MAP = [
        'sales-summary' => SalesSummaryReport::class,
        'sales-by-product' => SalesByProductReport::class,
        'sales-by-cashier' => SalesByCashierReport::class,
        'sales-by-payment-method' => SalesByPaymentMethodReport::class,
        'stock-summary' => StockSummaryReport::class,
        'stock-card' => StockCardReport::class,
        'stock-critical-expiry' => StockCriticalExpiryReport::class,
        'cash-ledger' => CashLedgerReport::class,
        'receivable-aging' => ReceivableAgingReport::class,
        'debt-aging' => DebtAgingReport::class,
    ];

    /**
     * @return array<string, class-string<BaseReport>>
     */
    public static function all(): array
    {
        return self::MAP;
    }

    public static function has(string $key): bool
    {
        return array_key_exists($key, self::MAP);
    }

    /**
     * @return class-string<BaseReport>
     */
    public static function resolve(string $key): string
    {
        abort_unless(self::has($key), 404);

        return self::MAP[$key];
    }

    public static function make(string $key): BaseReport
    {
        $class = self::resolve($key);

        return new $class;
    }
}
