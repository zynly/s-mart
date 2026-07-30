<?php

namespace App\Http\Controllers;

use App\Exceptions\AuthorizationOverrideException;
use App\Http\Requests\AuthorizationOverrideRequest;
use App\Services\AuthorizationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;

class AuthorizationOverrideController extends Controller
{
    public function __invoke(AuthorizationOverrideRequest $request, AuthorizationService $service): RedirectResponse
    {
        try {
            $approver = $service->requestOverride(
                $request->string('permission')->toString(),
                $request->string('pin')->toString(),
            );
        } catch (AuthorizationOverrideException $e) {
            throw ValidationException::withMessages(['pin' => $e->getMessage()]);
        }

        return back()->with('success', "Disetujui oleh {$approver->name}.")->with('approverId', $approver->id);
    }
}
