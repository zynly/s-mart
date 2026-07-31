<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreExchangeRequest;
use App\Models\User;
use App\Services\ExchangeService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ExchangeController extends Controller
{
    public function __construct(private readonly ExchangeService $exchangeService) {}

    public function store(StoreExchangeRequest $request): RedirectResponse
    {
        $idempotencyKey = (string) $request->header('X-Idempotency-Key');
        $returnData = $request->validated('return');
        $approver = ($returnData['approver_id'] ?? null) !== null
            ? User::find($returnData['approver_id'])
            : null;

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
