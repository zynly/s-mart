<?php

namespace Database\Seeders;

use App\Models\CashAccount;
use App\Models\CashierSession;
use App\Models\Debt;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Promo;
use App\Models\Purchase;
use App\Models\Receivable;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Services\CashierSessionService;
use App\Services\DebtService;
use App\Services\PriceService;
use App\Services\PurchaseService;
use App\Services\ReceivableService;
use App\Services\SaleService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

/**
 * T-110. Seeder OPSIONAL — TIDAK dipanggil dari DatabaseSeeder (yang
 * dipakai `migrate:fresh --seed` biasa DAN oleh tests/TestCase.php
 * `$seed = true` untuk suite Pest T-105 — mencampur data transaksional
 * fiktif ke situ akan merusak asumsi test). Jalankan manual setelah
 * `migrate:fresh --seed`, khusus untuk demo/onboarding tim non-teknis:
 *
 *   php artisan db:seed --class=DemoSeeder
 *
 * Beda dari seeder lain (yang isi master data via `firstOrCreate`),
 * ini sengaja membuat data TRANSAKSIONAL (nota, sesi kasir, pembelian,
 * piutang/hutang) lewat service asli (SaleService, PurchaseService,
 * CashierSessionService, dst) — bukan INSERT mentah — supaya semua
 * aturan bisnis (potong stok FEFO, posting jurnal, update saldo kas)
 * ikut jalan benar, sama seperti transaksi sungguhan. Konsekuensinya:
 * TIDAK idempoten (jalan 2x = data dobel) — dirancang untuk sekali
 * jalan di atas DB yang baru di-`migrate:fresh --seed`.
 *
 * `sales.sale_date` di-mundurkan manual sesudah nota selesai (lihat
 * backdateSale()) supaya dashboard tren 7/30 hari & laporan per-tanggal
 * punya sebaran realistis 14 hari — kolom timestamp LAIN (activity_log,
 * stock_movements, journals) tetap mencatat waktu seeder benar-benar
 * dijalankan. Pergeseran kosmetik ini disengaja (murah, cukup untuk
 * kebutuhan demo), bukan usaha membuat seluruh riwayat konsisten
 * sampai ke detik.
 */
class DemoSeeder extends Seeder
{
    private const DAYS_OF_HISTORY = 14;

    /**
     * SKU-2 (Chitato) & SKU-4 (Oreo) sengaja DIKECUALIKAN dari pool
     * produk acak seedShift() — keduanya jadi target promo demo. Kalau
     * ikut ke keranjang acak, PromoEngine akan memotong grand_total di
     * server, sementara payments.amount di sini dihitung dari harga
     * LIST (tanpa promo) untuk kesederhanaan — jangan disatukan tanpa
     * menghitung ulang totalnya lewat PromoEngine juga.
     */
    private const PROMO_SKUS = ['SKU-0002', 'SKU-0004'];

    public function __construct(
        private readonly SaleService $saleService,
        private readonly CashierSessionService $sessionService,
        private readonly PurchaseService $purchaseService,
        private readonly DebtService $debtService,
        private readonly ReceivableService $receivableService,
        private readonly PriceService $priceService,
    ) {}

    public function run(): void
    {
        $outlet = Outlet::where('is_main', true)->first();
        $cashAccount = CashAccount::where('is_drawer', true)->where('is_active', true)->first();
        $cashiers = User::role('cashier')->get();
        $owner = User::where('username', 'owner')->first();
        $paymentMethods = PaymentMethod::whereIn('code', ['CASH', 'QRIS'])->get()->keyBy('code');
        $allProducts = Product::where('is_active', true)->with('prices')->get();
        $cartProducts = $allProducts->reject(fn (Product $p) => in_array($p->sku, self::PROMO_SKUS, true))->values();
        $members = Member::where('status', 'active')->get();

        if ($outlet === null || $cashAccount === null || $cashiers->isEmpty() || $allProducts->isEmpty() || $owner === null) {
            $this->command?->warn('DemoSeeder: butuh RolePermissionSeeder/UserSeeder/MasterDataSeeder/ProductSeeder/StockLayerSeeder jalan dulu (lihat DatabaseSeeder).');

            return;
        }

        Auth::login($owner);
        $this->seedPromos($allProducts);
        $creditMembers = $this->grantCreditLimit($members);

        foreach (range(self::DAYS_OF_HISTORY - 1, 0) as $daysAgo) {
            $date = now()->subDays($daysAgo);

            // Toko koperasi sekolah tutup Minggu — bukan cuma variasi acak,
            // supaya grafik tren dashboard punya pola mingguan yang masuk akal.
            if ($date->isSunday()) {
                continue;
            }

            foreach ($cashiers as $cashier) {
                $this->seedShift($cashier, $outlet, $cashAccount, $paymentMethods, $cartProducts, $members, $date);
            }
        }

        $this->seedCreditSales($cashiers->first(), $outlet, $cashAccount, $cartProducts, $creditMembers);

        Auth::login($owner);
        $this->seedPurchaseAndDebt($outlet);
        $this->seedReceivablePaymentDemo();
        Auth::logout();

        $this->command?->info(sprintf(
            'DemoSeeder selesai: %d nota, %d sesi kasir, %d pembelian, %d hutang, %d piutang.',
            Sale::count(),
            CashierSession::count(),
            Purchase::count(),
            Debt::count(),
            Receivable::count(),
        ));
    }

    private function seedPromos($products): void
    {
        $chitato = $products->firstWhere('sku', 'SKU-0002');
        $oreo = $products->firstWhere('sku', 'SKU-0004');

        if ($chitato === null || $oreo === null) {
            return;
        }

        $promo = Promo::firstOrCreate(
            ['code' => 'DEMO-SNACK10'],
            [
                'name' => 'Diskon Snack 10%',
                'description' => 'Promo demo — diskon 10% untuk Chitato & Oreo.',
                'type' => 'product',
                'scope' => 'item',
                'discount_type' => 'percent',
                'discount_value' => 10,
                'max_discount' => 2000,
                'is_stackable' => false,
                'is_public' => true,
                'is_active' => true,
                'priority' => 1,
                'created_by' => Auth::id(),
            ],
        );

        $promo->products()->syncWithoutDetaching([$chitato->id, $oreo->id]);
    }

    /**
     * @return Collection<int, Member>
     */
    private function grantCreditLimit($members): Collection
    {
        // 2 santri diberi limit piutang supaya modul piutang (T-088) ada
        // data berjalan untuk demo — default receivable_limit semua
        // member baru adalah 0 (tidak bisa kredit sama sekali).
        $chosen = $members->take(2);
        $chosen->each(fn (Member $m) => $m->update(['receivable_limit' => 150000]));

        return $chosen;
    }

    private function seedCreditSales(?User $cashier, Outlet $outlet, CashAccount $cashAccount, $products, $creditMembers): void
    {
        if ($cashier === null || $creditMembers->isEmpty()) {
            return;
        }

        $creditMethod = PaymentMethod::where('code', 'CREDIT')->first();

        if ($creditMethod === null) {
            return;
        }

        Auth::login($cashier);

        $leftover = $this->sessionService->getActive($cashier);

        if ($leftover !== null) {
            $this->sessionService->forceClose($leftover);
        }

        $session = $this->sessionService->open($cashier, $cashAccount, 200000);

        foreach ($creditMembers as $member) {
            $product = $products->random();
            $unit = Unit::find($product->base_unit_id);
            $price = $this->priceService->getActivePrice($product, $outlet, $unit, $member->id);
            $qty = 2;
            $amount = (int) round($price * $qty);

            // Sengaja di bawah receivable_limit (150.000) supaya tidak kena
            // CreditLimitExceededException — ini demo, bukan uji batas.
            if ($amount >= $member->receivable_limit) {
                continue;
            }

            try {
                $sale = $this->saleService->complete([
                    'outlet_id' => $outlet->id,
                    'cashier_session_id' => $session->id,
                    'member_id' => $member->id,
                    'idempotency_key' => (string) Str::uuid(),
                    'items' => [['product_id' => $product->id, 'unit_id' => $unit->id, 'qty' => $qty]],
                    'payments' => [['payment_method_id' => $creditMethod->id, 'amount' => $amount]],
                ]);

                $this->backdateSale($sale, now()->subDays(random_int(1, 6)));
            } catch (\Throwable) {
                // Lewati kalau produk kebetulan habis stok — bukan inti demo ini.
            }
        }

        // SaleService::complete() mengubah total_sales_cash dkk lewat baris
        // CashierSession lain (query fresh per panggilan) — $session di
        // memori sini jadi basi, harus di-refresh dulu sebelum dihitung
        // supaya actualCash yang dikirim ke close() benar-benar = expected
        // versi terbaru (tanpa ini close() bisa nolak dengan selisih palsu).
        $session->refresh();
        $expected = $this->sessionService->calculateExpected($session);
        $this->sessionService->close($session, $expected);

        Auth::logout();
    }

    private function seedShift(User $cashier, Outlet $outlet, CashAccount $cashAccount, $paymentMethods, $products, $members, Carbon $date): void
    {
        Auth::login($cashier);

        // Jaga-jaga sisa sesi belum tertutup dari jalan sebelumnya yang gagal
        // di tengah (mis. exception tak terduga) — tanpa ini open() berikutnya
        // akan lempar SessionAlreadyOpenException dan seluruh seeder berhenti.
        $leftover = $this->sessionService->getActive($cashier);

        if ($leftover !== null) {
            $this->sessionService->forceClose($leftover);
        }

        $openingCash = 200000;
        $session = $this->sessionService->open($cashier, $cashAccount, $openingCash);

        $saleCount = random_int(3, 7);

        for ($i = 0; $i < $saleCount; $i++) {
            $this->seedOneSale($session, $outlet, $paymentMethods, $products, $members, $date);
        }

        // SaleService::complete() mengubah total_sales_cash dkk lewat baris
        // CashierSession lain (query fresh per panggilan) — $session di
        // memori sini jadi basi, harus di-refresh dulu sebelum dihitung
        // supaya actualCash yang dikirim ke close() benar-benar = expected
        // versi terbaru (tanpa ini close() bisa nolak dengan selisih palsu).
        $session->refresh();
        $expected = $this->sessionService->calculateExpected($session);
        $this->sessionService->close($session, $expected);

        Auth::logout();
    }

    private function seedOneSale(CashierSession $session, Outlet $outlet, $paymentMethods, $products, $members, Carbon $date): void
    {
        $itemCount = min(random_int(1, 4), $products->count());
        $lineProducts = $products->random($itemCount);

        $useMember = $members->isNotEmpty() && random_int(1, 100) <= 40;
        $member = $useMember ? $members->random() : null;

        $items = [];
        $subtotal = 0;

        foreach ($lineProducts as $product) {
            $unit = Unit::find($product->base_unit_id);
            $qty = random_int(1, 3);
            $price = $this->priceService->getActivePrice($product, $outlet, $unit, $member?->id);

            $items[] = ['product_id' => $product->id, 'unit_id' => $unit->id, 'qty' => $qty];
            $subtotal += (int) round($price * $qty);
        }

        $methodRoll = random_int(1, 100);
        $method = $methodRoll <= 80 ? $paymentMethods['CASH'] : $paymentMethods['QRIS'];

        try {
            $sale = $this->saleService->complete([
                'outlet_id' => $outlet->id,
                'cashier_session_id' => $session->id,
                'member_id' => $member?->id,
                'idempotency_key' => (string) Str::uuid(),
                'items' => $items,
                'payments' => [['payment_method_id' => $method->id, 'amount' => $subtotal]],
            ]);

            $this->backdateSale($sale, $date);
        } catch (\Throwable) {
            // Stok tipis/edge-case lain — lewati baris ini, demo tidak perlu
            // 100% sukses tiap kali, cukup mayoritas.
        }
    }

    /**
     * Sale::observer punya guard idempoten (lihat SaleObserver::maybeJournalizeSale()
     * — cek Journal sudah ada sebelum posting ulang), jadi update biasa ini
     * AMAN tidak memicu jurnal dobel walau updated() event tetap jalan.
     */
    private function backdateSale(Sale $sale, Carbon $date): void
    {
        $backdated = $date->copy()->setTime(
            random_int(8, 20),
            random_int(0, 59),
            random_int(0, 59),
        );

        $sale->forceFill(['sale_date' => $backdated])->save();
    }

    private function seedPurchaseAndDebt(Outlet $outlet): void
    {
        $supplier = Supplier::where('code', 'SUP-01')->first();
        $rice = Product::where('sku', 'SKU-0011')->first(); // Beras Premium 5kg
        $oil = Product::where('sku', 'SKU-0012')->first(); // Minyak Goreng 1L

        if ($supplier === null || $rice === null || $oil === null) {
            return;
        }

        $unit = fn (Product $p) => Unit::find($p->base_unit_id);

        $purchase = $this->purchaseService->receive(
            [
                'supplier_id' => $supplier->id,
                'outlet_id' => $outlet->id,
                'invoice_no' => 'INV-DEMO-001',
                'purchase_date' => now()->subDays(5)->toDateString(),
                'payment_type' => 'credit',
            ],
            [
                ['product_id' => $rice->id, 'unit_id' => $unit($rice)->id, 'qty' => 20, 'unit_price' => 45000, 'expired_at' => now()->addMonths(8)->toDateString()],
                ['product_id' => $oil->id, 'unit_id' => $unit($oil)->id, 'qty' => 30, 'unit_price' => 13000, 'expired_at' => now()->addMonths(6)->toDateString()],
            ],
        );

        $debt = Debt::where('purchase_id', $purchase->id)->first();

        if ($debt !== null) {
            // Bayar sebagian supaya laporan hutang (aging) punya baris
            // "sudah dicicil", bukan cuma lunas/belum sama sekali.
            $this->debtService->pay($debt, (int) round($debt->total_amount * 0.4), null, Auth::user(), 'DEMO-BAYAR-1');
        }
    }

    private function seedReceivablePaymentDemo(): void
    {
        $receivable = Receivable::whereIn('status', ['unpaid', 'partial'])->first();

        if ($receivable === null) {
            return;
        }

        $this->receivableService->pay(
            $receivable,
            (int) round($receivable->remaining_amount * 0.5),
            'cash',
            null,
            null,
            Auth::user(),
            'Cicilan demo',
        );
    }
}
