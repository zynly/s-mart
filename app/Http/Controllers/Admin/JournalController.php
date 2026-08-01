<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreManualJournalRequest;
use App\Models\Account;
use App\Models\DebtPayment;
use App\Models\Journal;
use App\Models\Outlet;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use App\Models\ReceivablePayment;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Services\JournalService;
use DomainException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class JournalController extends Controller
{
    public function __construct(private readonly JournalService $journalService) {}

    public function index(Request $request): Response
    {
        $journals = Journal::query()
            ->with(['outlet:id,name', 'creator:id,name', 'poster:id,name'])
            ->when($request->string('type')->toString(), fn ($q, $type) => $q->where('type', $type))
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->when($request->string('from')->toString(), fn ($q, $date) => $q->where('journal_date', '>=', $date))
            ->when($request->string('to')->toString(), fn ($q, $date) => $q->where('journal_date', '<=', $date))
            ->orderByDesc('journal_date')
            ->orderByDesc('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Admin/Journals/Index', [
            'tab' => 'journals',
            'journals' => $journals,
            'accounts' => Account::where('is_active', true)->orderBy('code')->get(['id', 'code', 'name']),
            'outlets' => Outlet::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only('type', 'status', 'from', 'to'),
            'validation' => $this->validationSummary(),
        ]);
    }

    public function show(Journal $journal): Response
    {
        return Inertia::render('Admin/Journals/Show', [
            'journal' => $journal->load(['outlet:id,name', 'creator:id,name', 'poster:id,name', 'reversedJournal:id,reference', 'entries.account:id,code,name']),
        ]);
    }

    public function store(StoreManualJournalRequest $request): RedirectResponse
    {
        try {
            $journal = $this->journalService->createManual($request->validated(), $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['entries' => $e->getMessage()]);
        }

        return redirect()->route('admin.journals.show', $journal)->with('success', "Jurnal manual {$journal->reference} dibuat (draft) — posting dulu sebelum masuk laporan.");
    }

    public function post(Request $request, Journal $journal): RedirectResponse
    {
        try {
            $this->journalService->post($journal, $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return back()->with('success', "Jurnal {$journal->reference} diposting.");
    }

    public function reverse(Request $request, Journal $journal): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        try {
            $reversing = $this->journalService->reverse($journal, $data['reason'], $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['status' => $e->getMessage()]);
        }

        return redirect()->route('admin.journals.show', $reversing)->with('success', "Jurnal {$journal->reference} dibalik lewat {$reversing->reference}.");
    }

    /**
     * Validasi Jurnal (digabung sebagai bagian Index, Fase 13 §8 —
     * cakupannya kecil, tidak sepadan halaman sendiri). Hanya
     * mencakup tipe transaksi yang SELALU wajib berjurnal tanpa
     * pengecualian kondisional (beda dari Purchase konsinyasi/
     * StockWriteOff barang konsinyasi/Opname tanpa varians yang
     * SAH tidak berjurnal — menyertakan itu di sini cuma bikin
     * false positive berisik untuk treasurer).
     */
    private function validationSummary(): array
    {
        $missing = function (string $model, Builder $query) {
            $table = (new $model)->getTable();

            return $query
                ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('journals')
                    ->whereColumn('journals.sourceable_id', "{$table}.id")
                    ->where('journals.sourceable_type', $model))
                ->count();
        };

        return [
            'sale_without_journal' => $missing(Sale::class, Sale::where('status', 'completed')),
            'sale_return_without_journal' => $missing(SaleReturn::class, SaleReturn::where('status', 'completed')),
            'purchase_without_journal' => $missing(Purchase::class, Purchase::where('type', '!=', 'consignment')),
            'purchase_return_without_journal' => $missing(PurchaseReturn::class, PurchaseReturn::query()),
            'debt_payment_without_journal' => $missing(DebtPayment::class, DebtPayment::query()),
            'receivable_payment_without_journal' => $missing(ReceivablePayment::class, ReceivablePayment::query()),
            'unbalanced_journals' => Journal::whereColumn('total_debit', '!=', 'total_credit')->count(),
        ];
    }
}
