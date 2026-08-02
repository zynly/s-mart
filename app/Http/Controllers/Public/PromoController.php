<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\StorefrontService;
use Inertia\Inertia;
use Inertia\Response;

class PromoController extends Controller
{
    public function __construct(private readonly StorefrontService $storefront) {}

    public function index(): Response
    {
        return Inertia::render('Public/Promos', [
            'active' => $this->storefront->getActivePublicPromos()->map(fn ($p) => $this->storefront->formatPromoForDisplay($p))->values(),
            'upcoming' => $this->storefront->getUpcomingPublicPromos()->map(fn ($p) => $this->storefront->formatPromoForDisplay($p))->values(),
        ]);
    }
}
