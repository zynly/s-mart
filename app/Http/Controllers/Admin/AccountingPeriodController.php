<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AccountingPeriod;
use App\Services\JournalService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AccountingPeriodController extends Controller
{
    public function __construct(private readonly JournalService $journalService) {}

    public function index(): Response
    {
        return Inertia::render('Admin/AccountingPeriods/Index', [
            'tab' => 'accounting-periods',
            'periods' => AccountingPeriod::with('closer:id,name')->orderByDesc('year')->orderByDesc('month')->get(),
        ]);
    }

    public function close(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'year' => ['required', 'integer', 'min:2020', 'max:2100'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
        ]);

        try {
            $this->journalService->closePeriod($data['year'], $data['month'], $request->user());
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['period' => $e->getMessage()]);
        }

        return back()->with('success', "Periode {$data['month']}/{$data['year']} berhasil ditutup.");
    }

    public function reopen(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'year' => ['required', 'integer', 'min:2020', 'max:2100'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
        ]);

        try {
            $this->journalService->reopenPeriod($data['year'], $data['month']);
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['period' => $e->getMessage()]);
        }

        return back()->with('success', "Periode {$data['month']}/{$data['year']} dibuka kembali.");
    }
}
