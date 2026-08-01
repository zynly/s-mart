<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Services\JournalService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class LedgerController extends Controller
{
    public function __construct(private readonly JournalService $journalService) {}

    public function index(Request $request): Response
    {
        $accounts = Account::where('is_active', true)->orderBy('code')->get(['id', 'code', 'name']);
        $accountId = $request->integer('account_id') ?: null;
        $from = $request->string('from')->toString() ?: now()->startOfMonth()->toDateString();
        $to = $request->string('to')->toString() ?: now()->toDateString();

        $account = $accountId !== null ? Account::find($accountId) : null;
        $entries = [];
        $openingBalance = 0;

        if ($account !== null) {
            $entries = $this->journalService->getLedger($account, Carbon::parse($from), Carbon::parse($to));
            $openingBalance = $this->journalService->getLedger($account, Carbon::createFromDate(2000, 1, 1), Carbon::parse($from)->subDay())
                ->reduce(function (int $carry, $entry) use ($account) {
                    return $carry + ($account->normal_balance === 'debit' ? $entry->debit - $entry->credit : $entry->credit - $entry->debit);
                }, 0);
        }

        return Inertia::render('Admin/Ledger/Index', [
            'tab' => 'ledger',
            'accounts' => $accounts,
            'account' => $account,
            'entries' => $entries,
            'openingBalance' => $openingBalance,
            'filters' => ['account_id' => $accountId, 'from' => $from, 'to' => $to],
        ]);
    }
}
