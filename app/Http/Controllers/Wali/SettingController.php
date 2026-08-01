<?php

namespace App\Http\Controllers\Wali;

use App\Http\Controllers\Controller;
use App\Models\NotificationSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    public function edit(Request $request): Response
    {
        $guardian = $request->user('guardian');
        $setting = $guardian->notificationSetting ?? NotificationSetting::create(['guardian_id' => $guardian->id]);

        return Inertia::render('Wali/Settings/Edit', [
            'setting' => $setting->only('low_balance_alert', 'low_balance_threshold', 'weekly_summary', 'transaction_alert'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $guardian = $request->user('guardian');

        $data = $request->validate([
            'low_balance_alert' => ['required', 'boolean'],
            'low_balance_threshold' => ['required', 'integer', 'min:0'],
            'weekly_summary' => ['required', 'boolean'],
            'transaction_alert' => ['required', 'boolean'],
        ]);

        $setting = $guardian->notificationSetting ?? new NotificationSetting(['guardian_id' => $guardian->id]);
        $setting->fill($data)->save();

        return back()->with('success', 'Pengaturan notifikasi disimpan.');
    }
}
