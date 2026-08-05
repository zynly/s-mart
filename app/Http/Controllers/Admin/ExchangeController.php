<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreExchangeRequest;
use App\Services\AuthorizationService;
use App\Services\ExchangeService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ExchangeController extends Controller
{
    public function __construct(
        private readonly ExchangeService $exchangeService,
        private readonly AuthorizationService $authorizationService,
    ) {}

    public function store(StoreExchangeRequest $request): RedirectResponse
    {
        $idempotencyKey = (string) $request->header('X-Idempotency-Key');
        $returnData = $request->validated('return');
        // Audit Fase 1 (Temuan Kritis #1) — token sekali-pakai, permission
        // sama seperti retur biasa (tukar barang = retur + nota baru).
        $approver = $this->authorizationService->consumeToken($returnData['approval_token'] ?? null, 'sale_return.approve');

        try {
            $exchange = $this->exchangeService->process(
                $returnData,
                $request->validated('new_sale'),
                $approver,
                $idempotencyKey,
            );
        } catch (DomainException|RuntimeException $e) {
            throw ValidationException::withMessages(['items' => $e->getMessage()]);
        }

        return redirect()->route('pos.sales.receipt', $exchange->new_sale_id)
            ->with('success', "Tukar barang {$exchange->reference} selesai.");
    }
}
