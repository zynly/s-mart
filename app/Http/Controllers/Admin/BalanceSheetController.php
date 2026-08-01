<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\JournalService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class BalanceSheetController extends Controller
{
    public function __construct(private readonly JournalService $journalService) {}

    public function index(Request $request): Response
    {
        $asOf = $request->string('as_of')->toString() ?: now()->toDateString();

        return Inertia::render('Admin/BalanceSheet/Index', [
            'sheet' => $this->journalService->getBalanceSheet(Carbon::parse($asOf)),
            'asOf' => $asOf,
        ]);
    }
}
