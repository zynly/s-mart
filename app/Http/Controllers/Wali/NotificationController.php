<?php

namespace App\Http\Controllers\Wali;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * fase-16-v2.md §8-9. Lonceng notifikasi in-app untuk wali — pola
 * sama persis dengan Admin\NotificationController (T-094), hanya
 * guard-nya 'guardian'. `count()` terpisah dari `index()` supaya
 * polling 30 detik (usePollNotifications) tetap ringan (satu angka),
 * bukan fetch 20 baris tiap kali.
 */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user('guardian')->notifications()->latest()->limit(20)->get(['id', 'data', 'read_at', 'created_at']);

        return response()->json(['notifications' => $notifications]);
    }

    public function count(Request $request): JsonResponse
    {
        return response()->json(['count' => $request->user('guardian')->unreadNotifications()->count()]);
    }

    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user('guardian')->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json(['ok' => true]);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user('guardian')->unreadNotifications->markAsRead();

        return response()->json(['ok' => true]);
    }
}
