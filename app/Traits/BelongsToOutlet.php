<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

trait BelongsToOutlet
{
    protected static function bootBelongsToOutlet(): void
    {
        static::addGlobalScope('outlet', function (Builder $builder) {
            $user = auth()->user();

            if ($user === null || $user->outlet_id === null) {
                return;
            }

            $builder->where($builder->getModel()->getTable().'.outlet_id', $user->outlet_id);
        });
    }
}
