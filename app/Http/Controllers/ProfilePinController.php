<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateProfilePinRequest;
use Illuminate\Http\RedirectResponse;

class ProfilePinController extends Controller
{
    public function __invoke(UpdateProfilePinRequest $request): RedirectResponse
    {
        $request->user()->update(['pin' => $request->validated('pin')]);

        return back()->with('success', 'PIN berhasil diperbarui.');
    }
}
