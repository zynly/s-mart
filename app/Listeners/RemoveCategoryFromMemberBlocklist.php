<?php

namespace App\Listeners;

use App\Events\CategoryDeleting;
use Illuminate\Support\Facades\DB;

/**
 * members.blocked_categories (JSON) rentan bocor bila kategori dihapus.
 * Bersihkan id kategori dari seluruh blocklist anggota, chunked agar
 * aman di shared hosting.
 */
class RemoveCategoryFromMemberBlocklist
{
    public function handle(CategoryDeleting $event): void
    {
        $categoryId = $event->category->id;

        DB::table('members')
            ->whereJsonContains('blocked_categories', $categoryId)
            ->orderBy('id')
            ->chunkById(500, function ($members) use ($categoryId) {
                foreach ($members as $member) {
                    $blocked = json_decode($member->blocked_categories ?? '[]', true) ?? [];
                    $blocked = array_values(array_diff($blocked, [$categoryId]));

                    DB::table('members')
                        ->where('id', $member->id)
                        ->update(['blocked_categories' => json_encode($blocked)]);
                }
            });
    }
}
