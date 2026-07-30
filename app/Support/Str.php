<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str as BaseStr;

class Str
{
    public static function slugUnique(string $text, string $table, string $column = 'slug', ?int $ignoreId = null): string
    {
        $slug = BaseStr::slug($text);
        $original = $slug;
        $counter = 1;

        while (self::slugExists($table, $column, $slug, $ignoreId)) {
            $slug = $original.'-'.(++$counter);
        }

        return $slug;
    }

    private static function slugExists(string $table, string $column, string $slug, ?int $ignoreId): bool
    {
        $query = DB::table($table)->where($column, $slug);

        if ($ignoreId !== null) {
            $query->where('id', '!=', $ignoreId);
        }

        return $query->exists();
    }
}
