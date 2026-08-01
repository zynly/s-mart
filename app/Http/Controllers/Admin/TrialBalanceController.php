<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\JournalService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class TrialBalanceController extends Controller
{
    public function __construct(private readonly JournalService $journalService) {}

    public function index(Request $request): Response
    {
        $asOf = $request->string('as_of')->toString() ?: now()->toDateString();
        $rows = $this->journalService->getTrialBalance(Carbon::parse($asOf));

        return Inertia::render('Admin/TrialBalance/Index', [
            'rows' => $rows->values(),
            'totalDebit' => (int) $rows->sum('debit'),
            'totalCredit' => (int) $rows->sum('credit'),
            'asOf' => $asOf,
        ]);
    }
}
