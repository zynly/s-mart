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
        $permission = $request->string('permission')->toString();

        try {
            $approver = $service->requestOverride($permission, $request->string('pin')->toString());
        } catch (AuthorizationOverrideException $e) {
            throw ValidationException::withMessages(['pin' => $e->getMessage()]);
        }

        // Audit Fase 1: TIDAK LAGI mengirim approver->id mentah ke
        // client — lihat AuthorizationService::issueToken()/consumeToken().
        $token = $service->issueToken($approver, $permission);

        return back()->with('success', "Disetujui oleh {$approver->name}.")->with('overrideToken', $token);
    }
}
