<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\CreditLimitExceededException;
use App\Exceptions\InsufficientBalanceException;
use App\Exceptions\InsufficientPointBalanceException;
use App\Exceptions\InsufficientStockException;
use App\Exceptions\InvalidPinException;
use App\Exceptions\MaxHoldExceededException;
use App\Exceptions\MemberPinLockedException;
use App\Exceptions\MemberPinNotSetException;
use App\Exceptions\PaymentMismatchException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CompleteSaleRequest;
use App\Http\Requests\Admin\HoldSaleRequest;
use App\Http\Requests\Admin\VoidSaleRequest;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Member;
use App\Models\Outlet;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\Promo;
use App\Models\Sale;
use App\Models\SaleHold;
use App\Services\AuthorizationService;
use App\Services\BarcodeResolverService;
use App\Services\CardService;
use App\Services\CashierSessionService;
use App\Services\Midtrans\MidtransGatewayInterface;
use App\Services\PaymentGatewayService;
use App\Services\PaymentService;
use App\Services\PriceService;
use App\Services\SaleService;
use App\Services\VoucherService;
use Barryvdh\DomPDF\Facade\Pdf;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

use Illuminate\Support\Facades\DB;
use App\Models\CashAccount;

class SaleController extends Controller
{
    public function __construct(
        private readonly SaleService $saleService,
        private readonly CashierSessionService $sessionService,
        private readonly BarcodeResolverService $barcodeResolver,
        private readonly CardService $cardService,
        private readonly PriceService $priceService,
        private readonly PaymentService $paymentService,
        private readonly AuthorizationService $authorizationService,
        private readonly MidtransGatewayInterface $midtransGateway,
        private readonly PaymentGatewayService $paymentGatewayService,
        private readonly VoucherService $voucherService,
    ) {}

    public function index(Request $request): Response
    {
        $session = $this->sessionService->getActive($request->user());
        $outlet = $session?->outlet ?? Outlet::where('is_main', true)->first();

        // 1. Ambil channel Midtrans yang dicentang di settings
        $savedEnabledChannels = [];
        try {
            $row = DB::table('settings')
                ->where('group', 'midtrans')
                ->where('key', 'enabled_channels')
                ->first();
            $savedEnabledChannels = $row ? (json_decode($row->value, true) ?? []) : [];
        } catch (\Throwable) {
            $savedEnabledChannels = [];
        }

        // 2. Gateway Aktif
        $activeGateway = 'midtrans';
        try {
            $row = DB::table('settings')
                ->where('group', 'payment')
                ->where('key', 'active_gateway')
                ->first();
            if ($row && $row->value) {
                $activeGateway = $row->value;
            }
        } catch (\Throwable) {
            $activeGateway = 'midtrans';
        }

        // 3. Midtrans Channels Meta
        $midtransChannels = [];
        try {
            $midtransChannels = $this->midtransGateway->getActivePaymentChannels();
        } catch (\Throwable) {
            $midtransChannels = [];
        }

        return Inertia::render('Admin/Pos/Index', [
            'session' => $session,
            'outlet' => $outlet,
            'paymentMethods' => PaymentMethod::where('is_active', true)->orderBy('sort_order')
                ->get(['id', 'code', 'name', 'type', 'allows_change', 'requires_reference', 'mdr_percent', 'midtrans_code']),
            'savedEnabledChannels' => $savedEnabledChannels,
            'activeGateway' => $activeGateway,
            'midtransChannels' => $midtransChannels,
            'bankAccounts' => CashAccount::where('type', 'bank')->where('is_active', true)->get(['id', 'bank_name', 'account_number', 'account_holder']),
            'catalog' => $this->catalogPayload($request, $outlet),
            'categories' => Category::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'holds' => $session !== null
                ? SaleHold::where('cashier_session_id', $session->id)->orderByDesc('held_at')->get(['id', 'reference', 'item_count', 'total', 'held_at', 'member_id'])
                : [],
            'activePromos' => Promo::where('is_active', true)
                ->with(['products:id', 'categories:id'])
                ->where(function ($q) {
                    $q->whereNull('start_date')->orWhere('start_date', '<=', now()->toDateString());
                })
                ->where(function ($q) {
                    $q->whereNull('end_date')->orWhere('end_date', '>=', now()->toDateString());
                })
                ->orderByDesc('priority')
                ->get(['id', 'code', 'name', 'description', 'type', 'discount_type', 'discount_value', 'max_discount', 'min_purchase', 'buy_qty', 'get_qty', 'min_qty', 'scope', 'start_time', 'end_time', 'days_of_week']),
            'activeCoupons' => Coupon::where('status', 'active')
                ->where('valid_from', '<=', now())
                ->where('valid_until', '>=', now())
                ->whereColumn('used_count', '<', 'quota')
                ->orderByDesc('id')
                ->get(['id', 'code', 'name', 'discount_type', 'discount_value', 'max_discount', 'min_purchase', 'valid_until', 'source', 'quota', 'used_count']),
            'noPinThreshold' => (int) config('pos.no_pin_threshold', 0),
            'pointValue' => (int) config('pos.point_value', 100),
            'midtransClientKey' => config('services.midtrans.client_key'),
            'midtransIsProduction' => (bool) config('services.midtrans.is_production'),
        ]);
    }

    public function catalogApi(Request $request): JsonResponse
    {
        $session = $this->sessionService->getActive($request->user());
        $outlet = $session?->outlet ?? Outlet::where('is_main', true)->first();

        return response()->json($this->catalogPayload($request, $outlet));
    }

    public function validateCouponApi(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:30'],
            'items' => ['sometimes', 'array'],
            'items.*.product_id' => ['required_with:items', 'integer'],
            'items.*.subtotal' => ['required_with:items', 'integer'],
            'member_id' => ['nullable', 'integer'],
        ]);

        $member = !empty($data['member_id']) ? Member::find($data['member_id']) : null;
        $lines = $data['items'] ?? [];

        $result = $this->voucherService->validate($data['code'], $lines, $member);

        return response()->json($result);
    }

    /**
     * Integrasi Midtrans di kasir (QRIS/e-wallet/transfer) — order_id
     * EPHEMERAL, sengaja TIDAK disimpan ke tabel manapun: Sale belum
     * ada di titik ini (baru tercipta setelah kasir klik "Selesaikan
     * Transaksi"), jadi tidak ada baris untuk dikaitkan. Kasir menunggu
     * snap.pay() sukses/pending di BROWSER sebelum lanjut submit —
     * transaction_id hasilnya yang dipakai sebagai reference_no
     * pembayaran (lihat QrisHandler::handle()), sama seperti alur
     * top-up wali.
     */
    public function midtransCreatePayment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:1'],
            'type' => ['required', 'string', 'in:qris,ewallet,transfer'],
            'items' => ['sometimes', 'array'],
            'member_id' => ['nullable', 'integer'],
            'coupon_code' => ['nullable', 'string'],
        ]);

        $session = $this->sessionService->getActive($request->user());

        if ($session === null) {
            abort(422, 'Tidak ada sesi kasir aktif.');
        }

        $orderId = 'POS-'.$session->id.'-'.Str::random(10);

        // Cache pending POS cart payload (valid for 2 hours) so Webhook callback can auto-complete the sale if needed
        if (! empty($data['items'])) {
            $pendingCart = [
                'outlet_id' => $session->outlet_id,
                'cashier_session_id' => $session->id,
                'member_id' => $data['member_id'] ?? null,
                'coupon_code' => $data['coupon_code'] ?? null,
                'items' => $data['items'],
                'idempotency_key' => $orderId,
                'user_id' => $session->user_id,
                'payments' => [
                    [
                        'payment_method_id' => 1,
                        'amount' => $data['amount'],
                        'received_amount' => $data['amount'],
                        'reference_no' => $orderId,
                        'gateway_status' => 'settlement',
                    ],
                ],
            ];
            \Illuminate\Support\Facades\Cache::put("pos_pending_sale:{$orderId}", $pendingCart, now()->addHours(2));
        }

        $enabledPayments = match ($data['type']) {
            'qris' => ['other_qris'],
            'ewallet' => ['gopay', 'shopeepay'],
            'transfer' => ['bca_va', 'bni_va', 'bri_va', 'permata_va', 'other_va', 'echannel'],
        };

        $result = $this->paymentGatewayService->createTransaction(
            $orderId,
            $data['amount'],
            [],
            [['id' => 'pos-payment', 'price' => $data['amount'], 'quantity' => 1, 'name' => 'Pembayaran Kasir Skillage Mart']],
            $enabledPayments,
        );

        return response()->json($result);
    }

    /**
     * REVISI-R1-v2.md §4.7/§5.5 — Lapis 1: grid katalog kasir HANYA
     * menampilkan produk yang benar-benar punya stok (>0) di outlet
     * user yang login. Produk tanpa baris `stocks` sama sekali, atau
     * qty<=0, TIDAK MUNCUL — bukan hanya disamarkan di UI, memang tidak
     * ikut ter-query. Urutan: favorit dulu, lalu nama A-Z. 12/halaman.
     */
    private function catalogPayload(Request $request, ?Outlet $outlet): array
    {
        if ($outlet === null) {
            return ['data' => [], 'current_page' => 1, 'last_page' => 1, 'total' => 0];
        }

        $categoryIds = $request->input('category_ids');
        if (is_string($categoryIds)) {
            $categoryIds = array_filter(array_map('intval', explode(',', $categoryIds)));
        }

        $query = Product::query()
            ->where('is_active', true)
            ->whereHas('stocks', fn ($q) => $q->where('outlet_id', $outlet->id)->where('qty', '>', 0))
            ->when(!empty($categoryIds), fn ($q) => $q->whereIn('category_id', (array) $categoryIds))
            ->when(empty($categoryIds) && $request->integer('category_id'), fn ($q) => $q->where('category_id', $request->integer('category_id')))
            ->when($request->string('search')->toString(), fn ($q, $search) => $q->where(
                fn ($sub) => $sub->where('name', 'ilike', "%{$search}%")->orWhere('sku', 'ilike', "%{$search}%")
            ))
            ->with(['category:id,name', 'baseUnit:id,code,name', 'images' => fn ($q) => $q->where('is_primary', true)->limit(1)])
            ->orderByDesc('is_favorite')
            ->orderBy('name');

        $page = $query->paginate(24, ['id', 'name', 'sku', 'category_id', 'base_unit_id', 'is_favorite'], 'page', $request->integer('page', 1));

        $productIds = $page->pluck('id');
        $prices = ProductPrice::where('outlet_id', $outlet->id)
            ->whereIn('product_id', $productIds)
            ->whereNull('effective_to')
            ->get()
            ->keyBy('product_id');

        $now = now();
        $promoProductIds = Promo::query()
            ->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('start_date')->orWhere('start_date', '<=', $now->toDateString()))
            ->where(fn ($q) => $q->whereNull('end_date')->orWhere('end_date', '>=', $now->toDateString()))
            ->whereIn('type', ['product', 'clearance', 'buy_x_get_y', 'bundle', 'tiered_qty'])
            ->with('products:id')
            ->get()
            ->pluck('products')
            ->flatten()
            ->pluck('id')
            ->unique();

        $page->getCollection()->transform(function (Product $product) use ($prices, $promoProductIds) {
            $image = $product->images->first();

            return [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'category' => $product->category?->name,
                'unit' => $product->baseUnit ? ['id' => $product->baseUnit->id, 'code' => $product->baseUnit->code] : null,
                'is_favorite' => $product->is_favorite,
                'price' => $prices->get($product->id)?->price ?? 0,
                'has_promo' => $promoProductIds->contains($product->id),
                'image_url' => $image ? (str_starts_with($image->path, 'http') ? $image->path : url('/media/' . ltrim($image->path, '/'))) : null,
            ];
        });

        return $page->toArray();
    }

    public function scan(Request $request): JsonResponse
    {
        $data = $request->validate(['barcode' => ['required', 'string']]);
        $outlet = Outlet::findOrFail($request->integer('outlet_id') ?: Outlet::where('is_main', true)->value('id'));

        try {
            $resolved = $this->barcodeResolver->resolve($data['barcode']);
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        }

        try {
            $memberId = $request->integer('member_id') ?: null;
            $price = $this->priceService->getActivePrice($resolved['product'], $outlet, $resolved['unit'], $memberId);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $image = $resolved['product']->images()->where('is_primary', true)->first()
            ?? $resolved['product']->images()->first();

        $imageUrl = null;
        if ($image && $image->path) {
            $imageUrl = str_starts_with($image->path, 'http')
                ? $image->path
                : url('/media/' . ltrim($image->path, '/'));
        }

        return response()->json([
            'product' => [
                ...$resolved['product']->only(['id', 'name', 'sku']),
                'image_url' => $imageUrl,
            ],
            'unit' => $resolved['unit']->only(['id', 'code', 'name']),
            'qty_multiplier' => $resolved['qty_multiplier'],
            'price' => $price,
        ]);
    }

    public function searchMember(Request $request): JsonResponse
    {
        $query = (string) $request->string('q');

        if ($query === '') {
            return response()->json(['members' => []]);
        }

        $exact = $this->cardService->resolve($query);

        if ($exact !== null) {
            return response()->json(['members' => [$this->memberPayload($exact)]]);
        }

        $matches = Member::where('status', 'active')
            ->where(function ($q) use ($query) {
                $q->where('name', 'ilike', "%{$query}%")
                  ->orWhere('member_number', 'ilike', "%{$query}%")
                  ->orWhere('phone', 'ilike', "%{$query}%")
                  ->orWhere('class_name', 'ilike', "%{$query}%")
                  ->orWhereHas('cards', fn ($c) => $c->where('card_number', 'ilike', "%{$query}%"));
            })
            ->with('level:id,name,color')
            ->limit(10)
            ->get();

        return response()->json(['members' => $matches->map(fn (Member $m) => $this->memberPayload($m))]);
    }

    private function memberPayload(Member $member): array
    {
        $member->loadMissing('level:id,name,color');

        return [
            'id' => $member->id,
            'member_number' => $member->member_number,
            'name' => $member->name,
            'type' => $member->type,
            'class_name' => $member->class_name,
            'major' => $member->major,
            'balance_cache' => $member->balance_cache,
            'point_balance' => $member->point_balance,
            'receivable_limit' => $member->receivable_limit,
            'has_pin' => $member->pin !== null,
            'level' => $member->level ? ['name' => $member->level->name, 'color' => $member->level->color] : null,
            'status' => $member->status,
        ];
    }

    public function creditCheck(Request $request): JsonResponse
    {
        $data = $request->validate([
            'member_id' => ['required', 'exists:members,id'],
            'amount' => ['required', 'integer', 'min:1'],
        ]);

        $member = Member::findOrFail($data['member_id']);

        return response()->json($this->paymentService->canUseCredit($member, $data['amount']));
    }

    public function store(CompleteSaleRequest $request): RedirectResponse
    {
        $idempotencyKey = (string) $request->header('X-Idempotency-Key');

        try {
            $sale = $this->saleService->complete([
                ...$request->safe()->except(['items', 'payments']),
                'items' => $request->validated('items'),
                'payments' => $request->validated('payments'),
                'idempotency_key' => $idempotencyKey,
            ]);
        } catch (InsufficientStockException|InsufficientBalanceException|InsufficientPointBalanceException $e) {
            throw ValidationException::withMessages(['items' => $e->getMessage()]);
        } catch (PaymentMismatchException|CreditLimitExceededException|MemberPinNotSetException|InvalidPinException|MemberPinLockedException $e) {
            throw ValidationException::withMessages(['payments' => $e->getMessage()]);
        } catch (DomainException|RuntimeException $e) {
            throw ValidationException::withMessages(['items' => $e->getMessage()]);
        }

        return back()
            ->with('completed_sale_id', $sale->id)
            ->with('completed_sale_ref', $sale->reference)
            ->with('success', "Transaksi {$sale->reference} selesai.");
    }

    public function hold(HoldSaleRequest $request): RedirectResponse
    {
        try {
            $this->saleService->hold($request->validated());
        } catch (MaxHoldExceededException $e) {
            throw ValidationException::withMessages(['items' => $e->getMessage()]);
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['cashier_session_id' => $e->getMessage()]);
        }

        return back()->with('success', 'Transaksi ditahan (hold).');
    }

    public function recall(Request $request, SaleHold $saleHold): JsonResponse
    {
        try {
            $cart = $this->saleService->recall($saleHold, $request->user());
        } catch (DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        return response()->json(['cart' => $cart]);
    }

    public function void(VoidSaleRequest $request, Sale $sale): RedirectResponse
    {
        // Audit Fase 1 (Temuan Kritis #1): BUKAN User::find($approver_id)
        // lagi — token dari AuthorizationService::issueToken(), ditukar
        // (sekali pakai, terikat permission+peminta) lewat consumeToken().
        // $approver null di sini (token tidak valid/kedaluwarsa/dipakai
        // ulang) tetap diteruskan ke VoidService::void(), yang menolaknya
        // dengan pesan yang sama seperti sebelumnya.
        $approver = $this->authorizationService->consumeToken($request->validated('approval_token'), 'sale.void');

        try {
            $this->saleService->void($sale, $request->validated('reason'), $approver);
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['reason' => $e->getMessage()]);
        }

        return back()->with('success', "Nota {$sale->reference} dibatalkan.");
    }

    public function receipt(Sale $sale): Response
    {
        return Inertia::render('Admin/Pos/Receipt', [
            'sale' => $sale->load(['items.product:id,name', 'member', 'payments.paymentMethod', 'user:id,name']),
        ]);
    }

    public function receiptPdf(Sale $sale): HttpResponse
    {
        $sale->load(['items.product:id,name', 'member', 'payments.paymentMethod', 'user:id,name', 'outlet']);
        $width = (int) config('pos.receipt_width', 58);

        $pdf = Pdf::loadView('pdf.receipt', ['sale' => $sale, 'width' => $width])
            ->setPaper([0, 0, $width * 2.8346, $this->estimateReceiptHeight($sale)], 'portrait');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$sale->reference}.pdf\"",
        ]);
    }

    /**
     * dompdf tidak punya "auto height" native untuk ukuran halaman —
     * sebelumnya tinggi kertas di-hardcode 1500pt terlepas dari isi
     * nota, jadi nota pendek (1-2 item) tercetak dengan banyak ruang
     * kosong di bawah. Estimasi jumlah baris dari isi nota (item,
     * pembayaran, dst — HARUS mengikuti struktur resources/views/pdf/
     * receipt.blade.php baris demi baris) lalu dikonversi ke tinggi
     * kertas. Sengaja dilebihkan sedikit (mmPerLine longgar + buffer
     * margin) — nota kependekan MEMOTONG isi (fatal), nota kepanjangan
     * cuma nyisa spasi kosong tipis (kosmetik, tidak fatal).
     */
    private function estimateReceiptHeight(Sale $sale): float
    {
        $lines = 7; // nama toko + subjudul + alamat (3) + garis (1) + No/Kasir/Tgl (3)
        $lines += 1; // garis sebelum daftar item
        $lines += $sale->items->count() * 2; // nama produk + baris qty x harga, per item
        $lines += 1; // garis sebelum ringkasan total
        $lines += 3; // Subtotal, Diskon, TOTAL
        $lines += $sale->payments->count(); // satu baris "BAYAR (...)" per metode
        $lines += $sale->change_amount > 0 ? 1 : 0;

        if ($sale->member !== null) {
            $lines += 2; // garis + baris nama/kelas anggota
            if ($sale->payments->contains(fn ($p) => $p->paymentMethod->type === 'deposit')) {
                $lines += 1; // baris Saldo Akhir
            }
        }

        $lines += 3; // garis penutup + 2 baris ucapan terima kasih

        $mmPerLine = 4.2; // font 9pt Courier + line-height, sengaja longgar
        $marginMm = 8; // margin @page (2mm×2) + padding div .line berulang

        return ($lines * $mmPerLine + $marginMm) * 2.8346;
    }
}
