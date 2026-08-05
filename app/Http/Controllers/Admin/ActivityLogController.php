<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    /**
     * Gap G-08: kunci properti yang TIDAK BOLEH pernah sampai ke browser
     * apa adanya — pertahanan berlapis di luar `LogsActivityCustom::
     * logExcept(['password','pin','remember_token'])` (yang mencegahnya
     * di titik PENCATATAN untuk model yang pakai trait itu). Ini menutup
     * kemungkinan properti sensitif lolos dari sumber LAIN (mis. custom
     * `activity()->withProperties([...])` di masa depan yang lupa
     * mengecualikannya sendiri) — cocok berdasarkan NAMA kunci, bukan
     * daftar model tertentu.
     */
    private const SENSITIVE_KEY_PATTERN = '/password|pin|token|secret|credential/i';

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

        $logs->getCollection()->transform(function (Activity $activity) {
            $activity->setAttribute('properties', collect($this->maskSensitive($activity->properties->toArray())));

            return $activity;
        });

        return Inertia::render('Admin/ActivityLogs/Index', [
            'tab' => 'activity-logs',
            'logs' => $logs,
            'logNames' => Activity::query()->distinct()->pluck('log_name'),
            'filters' => $request->only('log_name', 'causer_id', 'date_from', 'date_to'),
        ]);
    }

    /**
     * @param  array<string, mixed>  $properties
     * @return array<string, mixed>
     */
    private function maskSensitive(array $properties): array
    {
        $masked = [];

        foreach ($properties as $key => $value) {
            if (is_array($value)) {
                $masked[$key] = $this->maskSensitive($value);

                continue;
            }

            $masked[$key] = is_string($key) && preg_match(self::SENSITIVE_KEY_PATTERN, $key) === 1
                ? '••••••'
                : $value;
        }

        return $masked;
    }
}
