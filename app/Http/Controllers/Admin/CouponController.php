<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCouponRequest;
use App\Models\Coupon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CouponController extends Controller
{
    public function index(Request $request): Response
    {
        $coupons = Coupon::query()
            ->with(['member:id,name,member_number', 'promo:id,name'])
            ->withCount('redemptions')
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Coupons/Index', [
            'tab' => 'coupons',
            'coupons' => $coupons,
            'filters' => $request->only('status'),
        ]);
    }

    public function store(StoreCouponRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $count = (int) ($data['generate_count'] ?? 1);
        unset($data['generate_count']);

        for ($i = 0; $i < $count; $i++) {
            Coupon::create([
                ...$data,
                'code' => $count > 1 ? strtoupper(Str::random(8)) : $data['code'],
                'status' => 'active',
                'source' => 'manual',
                'created_by' => $request->user()->id,
            ]);
        }

        return back()->with('success', $count > 1 ? "{$count} kupon berhasil dibuat." : 'Kupon berhasil dibuat.');
    }

    public function cancel(Coupon $coupon): RedirectResponse
    {
        $coupon->update(['status' => 'cancelled']);

        return back()->with('success', "Kupon {$coupon->code} dibatalkan.");
    }
}
