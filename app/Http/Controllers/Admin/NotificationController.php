<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Bel notifikasi di header (T-119 sudah pasang placeholder statis di
 * Fase UI-01, T-094 di sini mengisi datanya). Endpoint JSON kecil
 * (bukan Inertia::render) supaya dropdown bisa fetch tanpa full-page
 * visit — pola yang sama pentingnya dengan alasan `PageTabs` pakai
 * `router.visit` untuk navigasi halaman: ini murni panel kecil, bukan
 * halaman.
 */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()->notifications()->latest()->limit(20)->get(['id', 'data', 'read_at', 'created_at']);

        return response()->json(['notifications' => $notifications]);
    }

    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json(['ok' => true]);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['ok' => true]);
    }
}
