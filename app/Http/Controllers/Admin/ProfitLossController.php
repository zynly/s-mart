<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\JournalService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class ProfitLossController extends Controller
{
    public function __construct(private readonly JournalService $journalService) {}

    public function index(Request $request): Response
    {
        $from = $request->string('from')->toString() ?: now()->startOfMonth()->toDateString();
        $to = $request->string('to')->toString() ?: now()->toDateString();

        $current = $this->journalService->getProfitLoss(Carbon::parse($from), Carbon::parse($to));

        $prevFrom = Carbon::parse($from)->subMonthNoOverflow();
        $prevTo = Carbon::parse($to)->subMonthNoOverflow();
        $previous = $this->journalService->getProfitLoss($prevFrom, $prevTo);

        return Inertia::render('Admin/ProfitLoss/Index', [
            'tab' => 'profit-loss',
            'current' => $current,
            'previous' => $previous,
            'filters' => ['from' => $from, 'to' => $to],
        ]);
    }
}
