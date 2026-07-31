<?php

namespace App\Events;

use App\Models\Category;
use Illuminate\Foundation\Events\Dispatchable;

class CategoryDeleting
{
    use Dispatchable;

    public function __construct(public readonly Category $category) {}
}
