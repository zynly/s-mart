<?php

namespace App\Traits;

use App\Support\ReferenceGenerator;

trait HasReference
{
    protected static function bootHasReference(): void
    {
        static::creating(function ($model) {
            if (empty($model->reference)) {
                $model->reference = ReferenceGenerator::generate(
                    $model->referencePrefix ?? $model->getReferencePrefix(),
                    $model->outlet_id,
                );
            }
        });
    }

    protected function getReferencePrefix(): string
    {
        return $this->referencePrefix ?? strtoupper(substr(class_basename($this), 0, 3));
    }
}
