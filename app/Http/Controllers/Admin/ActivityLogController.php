<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    public function index(Request $request): Response
    {
        $logs = Activity::query()
            ->with('causer:id,name,username')
            ->when($request->string('log_name')->toString(), fn ($query, $logName) => $query->where('log_name', $logName))
            ->when($request->string('causer_id')->toString(), fn ($query, $causerId) => $query->where('causer_id', $causerId))
            ->when($request->date('date_from'), fn ($query, $date) => $query->where('created_at', '>=', $date->copy()->startOfDay()))
            ->when($request->date('date_to'), fn ($query, $date) => $query->where('created_at', '<', $date->copy()->addDay()->startOfDay()))
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Admin/ActivityLogs/Index', [
            'tab' => 'activity-logs',
            'logs' => $logs,
            'logNames' => Activity::query()->distinct()->pluck('log_name'),
            'filters' => $request->only('log_name', 'causer_id', 'date_from', 'date_to'),
        ]);
    }
}
