<?php

namespace App\Traits;

use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

trait LogsActivityCustom
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            // T-106: hash password/PIN TIDAK ikut ke activity_log —
            // logFillable() sebelumnya menyimpan nilai hash-nya (aman
            // secara kriptografis, tapi tidak perlu menumpuk banyak
            // hash di satu tabel yang kalau bocor mempermudah upaya
            // brute-force offline). Model lama (Member, Guardian) yang
            // sudah pakai trait ini otomatis ikut terlindungi.
            ->logExcept(['password', 'pin', 'remember_token'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName(class_basename($this))
            ->setDescriptionForEvent(fn (string $eventName) => "{$eventName} ".class_basename($this));
    }

    public function tapActivity($activity, string $eventName): void
    {
        $activity->properties = $activity->properties->merge([
            'ip' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
