<?php

namespace App\Providers;

use App\Models\CashierSession;
use App\Models\CashTransaction;
use App\Models\ConsignmentSettlement;
use App\Models\DebtPayment;
use App\Models\DepositTransaction;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use App\Models\Receivable;
use App\Models\ReceivablePayment;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\StockAdjustment;
use App\Models\StockOpname;
use App\Models\StockWriteOff;
use App\Observers\CashierSessionObserver;
use App\Observers\CashTransactionObserver;
use App\Observers\ConsignmentSettlementObserver;
use App\Observers\DebtPaymentObserver;
use App\Observers\DepositTransactionObserver;
use App\Observers\PurchaseObserver;
use App\Observers\PurchaseReturnObserver;
use App\Observers\ReceivableObserver;
use App\Observers\ReceivablePaymentObserver;
use App\Observers\SaleObserver;
use App\Observers\SaleReturnObserver;
use App\Observers\StockAdjustmentObserver;
use App\Observers\StockOpnameObserver;
use App\Observers\StockWriteOffObserver;
use App\Services\SettingsOverrideService;
use App\Services\WhatsApp\NullGateway;
use App\Services\WhatsApp\WhatsAppGatewayInterface;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // T-099 (Fase 16): config-driven — ganti ke FonnteGateway/
        // WablasGateway lewat services.whatsapp.gateway nanti (ADR-0010)
        // tanpa menyentuh kode pemanggil.
        $this->app->bind(WhatsAppGatewayInterface::class, config('services.whatsapp.gateway', NullGateway::class));
    }

    /**
     * Bootstrap any application services.
     *
     * T-081 (Fase 13): jurnal terbit OTOMATIS lewat Observer di sini —
     * TIDAK ADA panggilan JournalService manual di service manapun
     * (CATATAN-PERBAIKAN.md §Fase13 menegaskan ini eksplisit).
     */
    public function boot(): void
    {
        // T-103 (Fase 17): timpakan override tersimpan di tabel `settings`
        // ke config('pos.*') sebelum request ditangani — lihat komentar
        // di SettingsOverrideService untuk alasan pola ini dipilih.
        SettingsOverrideService::apply();

        Sale::observe(SaleObserver::class);
        SaleReturn::observe(SaleReturnObserver::class);
        Purchase::observe(PurchaseObserver::class);
        PurchaseReturn::observe(PurchaseReturnObserver::class);
        DebtPayment::observe(DebtPaymentObserver::class);
        DepositTransaction::observe(DepositTransactionObserver::class);
        ReceivablePayment::observe(ReceivablePaymentObserver::class);
        Receivable::observe(ReceivableObserver::class);
        CashTransaction::observe(CashTransactionObserver::class);
        CashierSession::observe(CashierSessionObserver::class);
        ConsignmentSettlement::observe(ConsignmentSettlementObserver::class);
        StockWriteOff::observe(StockWriteOffObserver::class);
        StockOpname::observe(StockOpnameObserver::class);
        StockAdjustment::observe(StockAdjustmentObserver::class);
    }
}
