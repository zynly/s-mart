<?php

namespace App\Console\Commands;

use App\Services\PointService;
use Illuminate\Console\Command;

class ExpirePoints extends Command
{
    protected $signature = 'point:expire';

    protected $description = 'Kadaluwarsakan poin reward anggota yang sudah melewati masa berlaku (point_expiry_months)';

    public function __construct(private readonly PointService $pointService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $expired = $this->pointService->expireDuePoints();

        $this->info("Selesai: {$expired} baris poin dikadaluwarsakan.");

        return self::SUCCESS;
    }
}
